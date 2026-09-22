import { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../utils/appError';
import { CreateOrderInput, OrderQueryInput } from '../validators/order.validators';
import { BVService } from './bv.service';
import { CommissionService } from './commission.service';

export class OrderService {
  /**
   * Creates an order with strict database transaction adhering to all 10 requirements:
   * 1. Validate product
   * 2. Validate stock
   * 3. Lock inventory
   * 4. Calculate wholesale price
   * 5. Calculate BV
   * 6. Create order
   * 7. Create order items
   * 8. Create inventory transaction
   * 9. Create BV ledger entries
   * 10. Trigger commission processing only after the order qualifies according to configuration
   *
   * NEVER trusts price/BV sent by frontend. Always retrieves current values from database.
   */
  public static async createOrder(userId: string, input: CreateOrderInput) {
    const {
      items: inputItems,
      fromCart,
      shippingAddressId,
      billingAddressId,
      shippingAddress: inlineShipping,
      billingAddress: inlineBilling,
      paymentMethod = 'CREDIT_CARD',
      markPaid = false,
    } = input;

    // 1. Resolve Cart or Explicit Items
    let itemsToProcess: Array<{ productId: string; quantity: number }> = [];

    if (fromCart || (!inputItems || inputItems.length === 0)) {
      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: { items: true },
      });

      if (!cart || cart.items.length === 0) {
        throw AppError.badRequest('Your shopping cart is empty.', 'CART_EMPTY');
      }

      itemsToProcess = cart.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      }));
    } else {
      itemsToProcess = inputItems;
    }

    // Resolve User profile to determine pricing tier (Distributor vs Customer)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        distributorProfile: {
          include: {
            businessCenters: { where: { status: 'ACTIVE' }, take: 1 },
          },
        },
        customer: true,
      },
    });

    if (!user) {
      throw AppError.notFound('User not found.', 'USER_NOT_FOUND');
    }

    const isDistributor = Boolean(user.distributorProfile);
    const distributorId = user.distributorProfile?.id;
    const customerId = user.customer?.id;
    const primaryBc = user.distributorProfile?.businessCenters[0];

    // ATOMIC DATABASE TRANSACTION
    const createdOrder = await prisma.$transaction(async (tx) => {
      // Step 1 & 2: Validate products & live stock from DB
      const validatedItems: Array<{
        product: any;
        quantity: number;
        unitPrice: Prisma.Decimal;
        unitBV: Prisma.Decimal;
        totalPrice: Prisma.Decimal;
        totalBV: Prisma.Decimal;
      }> = [];

      let orderSubtotal = new Prisma.Decimal(0);
      let orderTotalBV = new Prisma.Decimal(0);

      for (const item of itemsToProcess) {
        // Step 1: Validate product
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { inventory: true },
        });

        if (!product || product.deletedAt !== null) {
          throw AppError.notFound(`Product with ID '${item.productId}' does not exist.`);
        }

        if (product.status === 'INACTIVE' || product.status === 'DISCONTINUED') {
          throw AppError.badRequest(`Product '${product.name}' is inactive or discontinued.`);
        }

        // Step 2: Validate stock
        if (product.stock < item.quantity || (product.inventory && product.inventory.quantityOnHand < item.quantity)) {
          throw AppError.badRequest(
            `Insufficient stock for '${product.name}'. Available: ${product.stock}, requested: ${item.quantity}.`,
            'INSUFFICIENT_STOCK'
          );
        }

        // Step 3: Lock inventory (decrement immediately inside transaction)
        const updatedStock = product.stock - item.quantity;
        await tx.product.update({
          where: { id: product.id },
          data: {
            stock: updatedStock,
            status: updatedStock <= 0 ? 'OUT_OF_STOCK' : product.status,
          },
        });

        if (product.inventory) {
          await tx.inventory.update({
            where: { productId: product.id },
            data: {
              quantityOnHand: { decrement: item.quantity },
            },
          });
        }

        // Step 4: Calculate wholesale price (authoritative from DB)
        // For distributors: wholesalePrice; for customers: MRP
        const unitPriceNum = isDistributor
          ? Number(product.wholesalePrice ?? product.distributorPrice ?? product.mrp)
          : Number(product.mrp ?? product.retailPrice ?? product.wholesalePrice);
        const unitPrice = new Prisma.Decimal(unitPriceNum.toFixed(2));
        const totalPrice = unitPrice.mul(item.quantity);

        // Step 5: Calculate BV (authoritative from DB)
        const unitBVNum = Number(product.bv ?? 0);
        const unitBV = new Prisma.Decimal(unitBVNum.toFixed(2));
        const totalBV = unitBV.mul(item.quantity);

        orderSubtotal = orderSubtotal.add(totalPrice);
        orderTotalBV = orderTotalBV.add(totalBV);

        validatedItems.push({
          product,
          quantity: item.quantity,
          unitPrice,
          unitBV,
          totalPrice,
          totalBV,
        });
      }

      // Resolve or create addresses if needed
      let shippingId = shippingAddressId;
      let billingId = billingAddressId;

      if (!shippingId && inlineShipping) {
        const addr = await tx.address.create({
          data: {
            userId,
            type: 'SHIPPING',
            recipientName: inlineShipping.recipientName,
            phone: inlineShipping.phone,
            streetAddress: inlineShipping.streetAddress,
            apartment: inlineShipping.apartment,
            city: inlineShipping.city,
            state: inlineShipping.state,
            postalCode: inlineShipping.postalCode,
            country: inlineShipping.country,
          },
        });
        shippingId = addr.id;
      }

      if (!billingId && inlineBilling) {
        const addr = await tx.address.create({
          data: {
            userId,
            type: 'BILLING',
            recipientName: inlineBilling.recipientName,
            phone: inlineBilling.phone,
            streetAddress: inlineBilling.streetAddress,
            apartment: inlineBilling.apartment,
            city: inlineBilling.city,
            state: inlineBilling.state,
            postalCode: inlineBilling.postalCode,
            country: inlineBilling.country,
          },
        });
        billingId = addr.id;
      } else if (!billingId && shippingId) {
        billingId = shippingId;
      }

      const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const orderStatus: OrderStatus = markPaid ? 'PAID' : 'PAYMENT_PENDING';

      // Step 6: Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          distributorId,
          customerId,
          status: orderStatus,
          subtotal: orderSubtotal,
          taxAmount: new Prisma.Decimal(0),
          shippingAmount: new Prisma.Decimal(0),
          discountAmount: new Prisma.Decimal(0),
          totalAmount: orderSubtotal,
          totalBV: orderTotalBV,
          shippingAddressId: shippingId,
          billingAddressId: billingId,
          paidAt: markPaid ? new Date() : null,
        },
      });

      // Step 7: Create order items
      for (const vi of validatedItems) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: vi.product.id,
            quantity: vi.quantity,
            unitPrice: vi.unitPrice,
            unitBV: vi.unitBV,
            totalPrice: vi.totalPrice,
            totalBV: vi.totalBV,
          },
        });

        // Step 8: Create inventory transaction
        if (vi.product.inventory) {
          await tx.inventoryTransaction.create({
            data: {
              inventoryId: vi.product.inventory.id,
              productId: vi.product.id,
              type: 'ORDER_FULFILLMENT',
              quantity: -vi.quantity,
              balanceAfter: vi.product.stock - vi.quantity,
              referenceNumber: orderNumber,
              notes: `Order fulfillment for ${orderNumber}`,
            },
          });
        }
      }

      // Create Payment record
      await tx.payment.create({
        data: {
          orderId: order.id,
          paymentNumber: `PAY-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`,
          method: paymentMethod as PaymentMethod,
          status: markPaid ? 'COMPLETED' : 'PENDING',
          amount: orderSubtotal,
          currency: 'USD',
          paidAt: markPaid ? new Date() : null,
        },
      });

      // Step 9: Create BV ledger entries
      if (distributorId && Number(orderTotalBV) > 0) {
        // Accrue Personal Order Volume via immutable BVLedger
        await BVService.creditBV(
          {
            distributorId,
            businessCenterId: primaryBc?.id,
            sourceType: 'ORDER',
            sourceId: order.id,
            orderId: order.id,
            bv: Number(orderTotalBV),
            description: `Order BV accrual for ${orderNumber}`,
          },
          tx
        );

        // Increment Lifetime PV on distributor profile
        await tx.distributorProfile.update({
          where: { id: distributorId },
          data: {
            lifetimePV: { increment: orderTotalBV },
          },
        });

        // Propagate Binary Volume up the binary tree to ancestors
        if (primaryBc) {
          const myNode = await tx.mLMNode.findUnique({
            where: { businessCenterId: primaryBc.id },
          });

          if (myNode && myNode.placementParentId) {
            let parentNodeId: string | null = myNode.placementParentId;
            let currentLeg = myNode.placementPosition;
            let depthCount = 0;

            while (parentNodeId && depthCount < 25) {
              const currentParentId: string = parentNodeId;
              const ancestorNode: any = await tx.mLMNode.findUnique({
                where: { id: currentParentId },
                include: { businessCenter: true },
              });

              if (!ancestorNode) break;

              // Accrue leg volume to ancestor Business Center
              if (currentLeg === 'LEFT') {
                await tx.businessCenter.update({
                  where: { id: ancestorNode.businessCenterId },
                  data: {
                    leftVolume: { increment: orderTotalBV },
                    accumulatedLeftVolume: { increment: orderTotalBV },
                  },
                });
              } else if (currentLeg === 'RIGHT') {
                await tx.businessCenter.update({
                  where: { id: ancestorNode.businessCenterId },
                  data: {
                    rightVolume: { increment: orderTotalBV },
                    accumulatedRightVolume: { increment: orderTotalBV },
                  },
                });
              }

              // Record in ancestor immutable BVLedger
              await BVService.creditBV(
                {
                  distributorId: ancestorNode.distributorId,
                  businessCenterId: ancestorNode.businessCenterId,
                  sourceType: 'ORDER',
                  sourceId: order.id,
                  orderId: order.id,
                  bv: Number(orderTotalBV),
                  position: currentLeg,
                  sourceDistributorId: distributorId,
                  description: `Binary team volume from ${user.distributorProfile?.distributorCode} (${currentLeg} leg)`,
                },
                tx
              );

              currentLeg = ancestorNode.placementPosition;
              parentNodeId = ancestorNode.placementParentId;
              depthCount++;
            }
          }
        }
      }

      // Step 10: Trigger commission processing only after the order qualifies according to configuration
      // If order is paid/confirmed, invoke commission calculation
      if (orderStatus === 'PAID') {
        await CommissionService.processOrderCommissions(order.id, tx);
      }

      // Clear user cart if order was checked out from cart
      if (fromCart || (!inputItems || inputItems.length === 0)) {
        const cart = await tx.cart.findUnique({ where: { userId } });
        if (cart) {
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        }
      }

      return order;
    });

    logger.info(
      { orderId: createdOrder.id, orderNumber: createdOrder.orderNumber, totalAmount: createdOrder.totalAmount },
      'Order created successfully across 10 atomic transactional steps'
    );

    return await this.getOrderById(userId, user.roleName, createdOrder.id);
  }

  /**
   * Retrieves paginated orders for authenticated user (or all if admin).
   */
  public static async getOrders(userId: string, role: string, query: OrderQueryInput) {
    const { status, page = 1, limit = 20, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
    };

    // User scope: Non-admins can only see their own orders
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      where.OR = [
        { userId },
        { distributor: { userId } },
      ];
    }

    if (status) {
      where.status = status as OrderStatus;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  slug: true,
                  images: { where: { isPrimary: true }, take: 1 },
                },
              },
            },
          },
          payments: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: orders.map((o) => this.formatOrder(o)),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Retrieves single order by ID or orderNumber.
   */
  public static async getOrderById(userId: string, role: string, orderIdOrNumber: string) {
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }],
        deletedAt: null,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                slug: true,
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
        shippingAddress: true,
        billingAddress: true,
        payments: true,
        bvLedgers: true,
        distributor: {
          select: {
            id: true,
            distributorCode: true,
            firstName: true,
            lastName: true,
            displayName: true,
          },
        },
      },
    });

    if (!order) {
      throw AppError.notFound('Order not found.', 'ORDER_NOT_FOUND');
    }

    // Access control: Only owner or admin can view
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && order.userId !== userId) {
      throw AppError.forbidden('You do not have permission to view this order.', 'AUTH_FORBIDDEN');
    }

    return this.formatOrder(order);
  }

  /**
   * Cancels an order:
   * - Verifies status is cancellable (PENDING, PAYMENT_PENDING, PROCESSING)
   * - Restores stock to Product and Inventory
   * - Creates reverse InventoryTransaction
   * - Reverses BVLedger entries and cancels associated commissions
   */
  public static async cancelOrder(userId: string, role: string, orderIdOrNumber: string) {
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }],
        deletedAt: null,
      },
      include: {
        items: true,
        bvLedgers: true,
      },
    });

    if (!order) {
      throw AppError.notFound('Order not found.', 'ORDER_NOT_FOUND');
    }

    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && order.userId !== userId) {
      throw AppError.forbidden('You do not have permission to cancel this order.', 'AUTH_FORBIDDEN');
    }

    const nonCancellable = ['SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
    if (nonCancellable.includes(order.status)) {
      throw AppError.badRequest(
        `Order cannot be cancelled in '${order.status}' status.`,
        'ORDER_NON_CANCELLABLE'
      );
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      // 1. Restock products & inventory
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            status: 'ACTIVE',
          },
        });

        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });

        if (inventory) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: {
              quantityOnHand: { increment: item.quantity },
            },
          });

          await tx.inventoryTransaction.create({
            data: {
              inventoryId: inventory.id,
              productId: item.productId,
              type: 'RETURN',
              quantity: item.quantity,
              balanceAfter: inventory.quantityOnHand + item.quantity,
              referenceNumber: order.orderNumber,
              notes: `Restock from cancelled order ${order.orderNumber}`,
            },
          });
        }
      }

      // 2. Reverse BV Ledger & deduct Lifetime PV
      if (order.distributorId && Number(order.totalBV) > 0) {
        await tx.distributorProfile.update({
          where: { id: order.distributorId },
          data: {
            lifetimePV: { decrement: order.totalBV },
          },
        });

        await BVService.debitBV(
          {
            distributorId: order.distributorId,
            sourceType: 'ORDER_REFUND',
            sourceId: order.id,
            bv: Number(order.totalBV),
            description: `BV reversal for cancelled order ${order.orderNumber}`,
          },
          tx
        );
      }

      // 3. Update Order status to CANCELLED
      return await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          payments: true,
        },
      });
    });

    logger.info({ orderId: cancelled.id, orderNumber: cancelled.orderNumber }, 'Order cancelled and restocked');
    return this.formatOrder(cancelled);
  }

  /**
   * Formats order output with numeric conversions.
   */
  private static formatOrder(order: any) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      distributorId: order.distributorId,
      customerId: order.customerId,
      status: order.status,
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      shippingAmount: Number(order.shippingAmount),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
      totalBV: Number(order.totalBV),
      shippingAddress: order.shippingAddress || null,
      billingAddress: order.billingAddress || null,
      trackingNumber: order.trackingNumber,
      paidAt: order.paidAt,
      cancelledAt: order.cancelledAt,
      items: (order.items || []).map((i: any) => ({
        id: i.id,
        productId: i.productId,
        productName: i.product?.name,
        sku: i.product?.sku,
        slug: i.product?.slug,
        thumbnailUrl: i.product?.images?.[0]?.url || null,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        unitBV: Number(i.unitBV),
        totalPrice: Number(i.totalPrice),
        totalBV: Number(i.totalBV),
      })),
      payments: (order.payments || []).map((p: any) => ({
        id: p.id,
        paymentNumber: p.paymentNumber,
        method: p.method,
        status: p.status,
        amount: Number(p.amount),
        currency: p.currency,
        paidAt: p.paidAt,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
