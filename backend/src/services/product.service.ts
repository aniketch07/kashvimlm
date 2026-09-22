import { Prisma, ProductStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../utils/appError';
import {
  CreateProductInput,
  ProductQueryInput,
  UpdateProductInput,
} from '../validators/product.validators';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class ProductService {
  /**
   * Automatically ensures the primary database-driven categories exist:
   * 1. CLOTHES_HOSIERY
   * 2. ELECTRONICS_SMART_DEVICES
   */
  public static async ensureDefaultCategories(): Promise<void> {
    const defaults = [
      {
        categoryCode: 'CLOTHES_HOSIERY',
        name: 'Clothes & Hosiery',
        slug: 'clothes-hosiery',
        description: 'Premium apparel, activewear, thermal base layers, and therapeutic compression hosiery',
        displayOrder: 1,
      },
      {
        categoryCode: 'ELECTRONICS_SMART_DEVICES',
        name: 'Electronics & Smart Devices',
        slug: 'electronics-smart-devices',
        description: 'Smart wearables, health tracking monitors, bio-impedance scales, and IoT wellness devices',
        displayOrder: 2,
      },
    ];

    for (const cat of defaults) {
      await prisma.productCategory.upsert({
        where: { slug: cat.slug },
        update: { categoryCode: cat.categoryCode },
        create: {
          categoryCode: cat.categoryCode,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          isActive: true,
          displayOrder: cat.displayOrder,
        },
      });
    }
  }

  /**
   * Retrieves paginated products with filtering and sorting.
   */
  public static async getProducts(query: ProductQueryInput) {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      minBV,
      maxBV,
      stock,
      status,
      sort = 'featured',
      page = 1,
      limit = 20,
    } = query;

    const skip = (page - 1) * limit;
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
    };

    // 1. Status Filter
    if (status) {
      where.status = status as ProductStatus;
    } else {
      // Default public visibility
      where.status = { in: ['ACTIVE', 'OUT_OF_STOCK', 'DRAFT'] };
    }

    // 2. Category Filter (by slug, code, or UUID)
    if (category) {
      const resolvedCategory = await prisma.productCategory.findFirst({
        where: {
          OR: [{ id: category }, { categoryCode: category }, { slug: category }],
        },
        include: { children: true },
      });

      if (resolvedCategory) {
        const categoryIds = [
          resolvedCategory.id,
          ...resolvedCategory.children.map((c) => c.id),
        ];
        where.categoryId = { in: categoryIds };
      } else {
        // Return empty if category specified but not found
        where.categoryId = 'non-existent-category';
      }
    }

    // 3. Search Filter (matches name, SKU, or description)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 4. Price Filter (Wholesale Price / MRP)
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.wholesalePrice = {
        ...(minPrice !== undefined && { gte: new Prisma.Decimal(minPrice) }),
        ...(maxPrice !== undefined && { lte: new Prisma.Decimal(maxPrice) }),
      };
    }

    // 5. BV Filter
    if (minBV !== undefined || maxBV !== undefined) {
      where.bv = {
        ...(minBV !== undefined && { gte: new Prisma.Decimal(minBV) }),
        ...(maxBV !== undefined && { lte: new Prisma.Decimal(maxBV) }),
      };
    }

    // 6. Stock Filter
    if (stock) {
      if (stock === 'in_stock') {
        where.stock = { gt: 0 };
      } else if (stock === 'out_of_stock') {
        where.stock = { lte: 0 };
      } else if (stock === 'low_stock') {
        where.stock = { gt: 0, lte: 10 };
      }
    }

    // 7. Sorting Criteria
    let orderBy: Prisma.ProductOrderByWithRelationInput[] = [];
    switch (sort) {
      case 'newest':
        orderBy = [{ createdAt: 'desc' }];
        break;
      case 'price_low':
        orderBy = [{ wholesalePrice: 'asc' }, { mrp: 'asc' }];
        break;
      case 'price_high':
        orderBy = [{ wholesalePrice: 'desc' }, { mrp: 'desc' }];
        break;
      case 'BV':
        orderBy = [{ bv: 'desc' }];
        break;
      case 'featured':
      default:
        orderBy = [{ isFeatured: 'desc' }, { createdAt: 'desc' }];
        break;
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              categoryCode: true,
              name: true,
              slug: true,
            },
          },
          images: {
            orderBy: { displayOrder: 'asc' },
            select: {
              id: true,
              url: true,
              altText: true,
              isPrimary: true,
              displayOrder: true,
            },
          },
          inventory: {
            select: {
              quantityOnHand: true,
              quantityReserved: true,
              reorderThreshold: true,
            },
          },
        },
      }),
    ]);

    const formattedProducts = products.map((p) => this.formatProduct(p));
    const totalPages = Math.ceil(total / limit);

    return {
      items: formattedProducts,
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
   * Retrieves single product by slug or UUID.
   */
  public static async getProductBySlug(slugOrId: string) {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ slug: slugOrId }, { id: slugOrId }],
        deletedAt: null,
      },
      include: {
        category: {
          select: {
            id: true,
            categoryCode: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        images: {
          orderBy: { displayOrder: 'asc' },
          select: {
            id: true,
            url: true,
            altText: true,
            isPrimary: true,
            displayOrder: true,
          },
        },
        inventory: {
          select: {
            quantityOnHand: true,
            quantityReserved: true,
            reorderThreshold: true,
          },
        },
      },
    });

    if (!product) {
      throw AppError.notFound(`Product '${slugOrId}' not found.`, 'PRODUCT_NOT_FOUND');
    }

    return this.formatProduct(product);
  }

  /**
   * Admin-Only: Creates a new product with stock, pricing, BV, and image gallery.
   */
  public static async createProduct(input: CreateProductInput) {
    // 1. Check SKU Uniqueness
    const existingSku = await prisma.product.findUnique({
      where: { sku: input.sku },
    });
    if (existingSku) {
      throw AppError.conflict(
        `A product with SKU '${input.sku}' already exists.`,
        'PRODUCT_SKU_CONFLICT'
      );
    }

    // 2. Resolve Category (by UUID, categoryCode, or slug)
    const category = await prisma.productCategory.findFirst({
      where: {
        OR: [
          { id: input.categoryId },
          { categoryCode: input.categoryId },
          { slug: input.categoryId },
        ],
      },
    });

    if (!category) {
      throw AppError.notFound(
        `Category '${input.categoryId}' not found.`,
        'PRODUCT_CATEGORY_NOT_FOUND'
      );
    }

    // 3. Generate Unique Slug
    let baseSlug = input.slug || slugify(input.name);
    let finalSlug = baseSlug;
    let collisionCheck = await prisma.product.findUnique({ where: { slug: finalSlug } });
    if (collisionCheck) {
      finalSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 4. Determine status based on stock if specified as ACTIVE
    let productStatus: ProductStatus = input.status as ProductStatus;
    if (productStatus === 'ACTIVE' && input.stock === 0) {
      productStatus = 'OUT_OF_STOCK';
    }

    const wholesaleDecimal = new Prisma.Decimal(input.wholesalePrice);
    const mrpDecimal = new Prisma.Decimal(input.mrp);
    const bvDecimal = new Prisma.Decimal(input.bv);

    // 5. Parse Images input
    const imageRecords = (input.images || []).map((img, index) => {
      if (typeof img === 'string') {
        return {
          url: img,
          altText: input.name,
          isPrimary: index === 0,
          displayOrder: index,
        };
      }
      return {
        url: img.url,
        altText: img.altText || input.name,
        isPrimary: img.isPrimary ?? index === 0,
        displayOrder: img.displayOrder ?? index,
      };
    });

    // 6. Execute Atomic Product Creation
    const createdProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sku: input.sku,
          name: input.name,
          slug: finalSlug,
          description: input.description,
          categoryId: category.id,
          wholesalePrice: wholesaleDecimal,
          mrp: mrpDecimal,
          retailPrice: mrpDecimal,
          distributorPrice: wholesaleDecimal,
          bv: bvDecimal,
          stock: input.stock,
          lowStockThreshold: input.lowStockThreshold,
          status: productStatus,
          isFeatured: input.isFeatured,
          inventory: {
            create: {
              quantityOnHand: input.stock,
              quantityReserved: 0,
              reorderThreshold: input.lowStockThreshold,
            },
          },
          images: {
            create: imageRecords,
          },
        },
        include: {
          category: {
            select: {
              id: true,
              categoryCode: true,
              name: true,
              slug: true,
            },
          },
          images: {
            orderBy: { displayOrder: 'asc' },
          },
          inventory: true,
        },
      });

      return product;
    });

    logger.info({ productId: createdProduct.id, sku: createdProduct.sku }, 'Product created successfully');
    return this.formatProduct(createdProduct);
  }

  /**
   * Admin-Only: Updates an existing product.
   */
  public static async updateProduct(id: string, input: UpdateProductInput) {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { inventory: true },
    });

    if (!existing || existing.deletedAt !== null) {
      throw AppError.notFound('Product not found.', 'PRODUCT_NOT_FOUND');
    }

    // 1. If SKU is being updated, verify uniqueness
    if (input.sku && input.sku !== existing.sku) {
      const conflictSku = await prisma.product.findUnique({
        where: { sku: input.sku },
      });
      if (conflictSku) {
        throw AppError.conflict(
          `A product with SKU '${input.sku}' already exists.`,
          'PRODUCT_SKU_CONFLICT'
        );
      }
    }

    // 2. Resolve Category if provided
    let categoryId = existing.categoryId;
    if (input.categoryId) {
      const cat = await prisma.productCategory.findFirst({
        where: {
          OR: [
            { id: input.categoryId },
            { categoryCode: input.categoryId },
            { slug: input.categoryId },
          ],
        },
      });
      if (!cat) {
        throw AppError.notFound(
          `Category '${input.categoryId}' not found.`,
          'PRODUCT_CATEGORY_NOT_FOUND'
        );
      }
      categoryId = cat.id;
    }

    // 3. Slug handling
    let finalSlug = existing.slug;
    if (input.slug && input.slug !== existing.slug) {
      const conflictSlug = await prisma.product.findUnique({
        where: { slug: input.slug },
      });
      if (conflictSlug && conflictSlug.id !== id) {
        throw AppError.conflict(
          `A product with slug '${input.slug}' already exists.`,
          'PRODUCT_SLUG_CONFLICT'
        );
      }
      finalSlug = input.slug;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Stock update sync with inventory
      const newStock = input.stock !== undefined ? input.stock : existing.stock;
      const newThreshold =
        input.lowStockThreshold !== undefined
          ? input.lowStockThreshold
          : existing.lowStockThreshold;

      if (input.stock !== undefined || input.lowStockThreshold !== undefined) {
        await tx.inventory.upsert({
          where: { productId: id },
          update: {
            ...(input.stock !== undefined && { quantityOnHand: input.stock }),
            ...(input.lowStockThreshold !== undefined && {
              reorderThreshold: input.lowStockThreshold,
            }),
          },
          create: {
            productId: id,
            quantityOnHand: newStock,
            quantityReserved: 0,
            reorderThreshold: newThreshold,
          },
        });
      }

      // Images update if provided
      if (input.images !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        const imageRecords = input.images.map((img, index) => {
          if (typeof img === 'string') {
            return {
              url: img,
              altText: input.name || existing.name,
              isPrimary: index === 0,
              displayOrder: index,
            };
          }
          return {
            url: img.url,
            altText: img.altText || input.name || existing.name,
            isPrimary: img.isPrimary ?? index === 0,
            displayOrder: img.displayOrder ?? index,
          };
        });
        await tx.productImage.createMany({
          data: imageRecords.map((r) => ({ ...r, productId: id })),
        });
      }

      const wholesaleDecimal =
        input.wholesalePrice !== undefined
          ? new Prisma.Decimal(input.wholesalePrice)
          : existing.wholesalePrice;
      const mrpDecimal =
        input.mrp !== undefined ? new Prisma.Decimal(input.mrp) : existing.mrp;
      const bvDecimal =
        input.bv !== undefined ? new Prisma.Decimal(input.bv) : existing.bv;

      let status = (input.status || existing.status) as ProductStatus;
      if (status === 'ACTIVE' && newStock === 0) {
        status = 'OUT_OF_STOCK';
      }

      return await tx.product.update({
        where: { id },
        data: {
          ...(input.sku && { sku: input.sku }),
          ...(input.name && { name: input.name }),
          slug: finalSlug,
          ...(input.description !== undefined && { description: input.description }),
          categoryId,
          wholesalePrice: wholesaleDecimal,
          mrp: mrpDecimal,
          retailPrice: mrpDecimal,
          distributorPrice: wholesaleDecimal,
          bv: bvDecimal,
          stock: newStock,
          lowStockThreshold: newThreshold,
          status,
          ...(input.isFeatured !== undefined && { isFeatured: input.isFeatured }),
        },
        include: {
          category: {
            select: {
              id: true,
              categoryCode: true,
              name: true,
              slug: true,
            },
          },
          images: {
            orderBy: { displayOrder: 'asc' },
          },
          inventory: true,
        },
      });
    });

    logger.info({ productId: id }, 'Product updated successfully');
    return this.formatProduct(updated);
  }

  /**
   * Admin-Only: Soft-deletes a product by ID.
   */
  public static async deleteProduct(id: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.deletedAt !== null) {
      throw AppError.notFound('Product not found.', 'PRODUCT_NOT_FOUND');
    }

    await prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
      },
    });

    logger.info({ productId: id, sku: existing.sku }, 'Product soft-deleted successfully');
    return {
      id,
      sku: existing.sku,
      status: 'INACTIVE',
      deleted: true,
    };
  }

  /**
   * Retrieves all database-driven categories.
   */
  public static async getCategories() {
    await this.ensureDefaultCategories();

    const categories = await prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: {
            products: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    return categories.map((c) => ({
      id: c.id,
      categoryCode: c.categoryCode,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.imageUrl,
      displayOrder: c.displayOrder,
      productCount: c._count.products,
    }));
  }

  /**
   * Formats product entity to return clean requested fields.
   */
  private static formatProduct(product: any) {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      description: product.description,
      categoryId: product.categoryId,
      category: product.category || null,
      wholesalePrice: Number(product.wholesalePrice ?? product.distributorPrice ?? 0),
      mrp: Number(product.mrp ?? product.retailPrice ?? 0),
      bv: Number(product.bv ?? 0),
      stock: product.stock ?? product.inventory?.quantityOnHand ?? 0,
      lowStockThreshold:
        product.lowStockThreshold ?? product.inventory?.reorderThreshold ?? 10,
      status: product.status,
      isFeatured: Boolean(product.isFeatured),
      images: (product.images || []).map((img: any) => ({
        id: img.id,
        url: img.url,
        altText: img.altText,
        isPrimary: img.isPrimary,
        displayOrder: img.displayOrder,
      })),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
