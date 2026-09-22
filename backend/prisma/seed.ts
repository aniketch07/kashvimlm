import { PrismaClient, Prisma } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('🌱 Seeding Kashvimlm Enterprise Database...');

  // 1. Roles
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: {
      name: 'SUPER_ADMIN',
      description: 'Super Administrator with root authority',
      permissions: { all: true, root: true },
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'System Administrator with operational access',
      permissions: { all: true },
    },
  });

  const distributorRole = await prisma.role.upsert({
    where: { name: 'DISTRIBUTOR' },
    update: {},
    create: {
      name: 'DISTRIBUTOR',
      description: 'Independent Business Owner / Distributor',
      permissions: { portal: true, businessCenter: true, wallet: true },
    },
  });

  const customerRole = await prisma.role.upsert({
    where: { name: 'CUSTOMER' },
    update: {},
    create: {
      name: 'CUSTOMER',
      description: 'Retail or Preferred Customer',
      permissions: { shop: true, orderHistory: true },
    },
  });

  const supportRole = await prisma.role.upsert({
    where: { name: 'SUPPORT' },
    update: {},
    create: {
      name: 'SUPPORT',
      description: 'Customer Support and Ticket Agent',
      permissions: { tickets: true, viewMembers: true },
    },
  });

  // 2. Ranks
  const rankBronze = await prisma.rank.upsert({
    where: { rankCode: 'RANK_BRONZE' },
    update: {},
    create: {
      rankCode: 'RANK_BRONZE',
      name: 'Bronze',
      level: 1,
      minPersonalBV: new Prisma.Decimal('100.00'),
      minGroupBV: new Prisma.Decimal('500.00'),
      minActiveLegs: 2,
      binaryWeeklyCap: new Prisma.Decimal('1000.00'),
      oneTimeBonus: new Prisma.Decimal('50.00'),
    },
  });

  const rankSilver = await prisma.rank.upsert({
    where: { rankCode: 'RANK_SILVER' },
    update: {},
    create: {
      rankCode: 'RANK_SILVER',
      name: 'Silver',
      level: 2,
      minPersonalBV: new Prisma.Decimal('150.00'),
      minGroupBV: new Prisma.Decimal('2500.00'),
      minActiveLegs: 2,
      binaryWeeklyCap: new Prisma.Decimal('3000.00'),
      oneTimeBonus: new Prisma.Decimal('150.00'),
    },
  });

  const rankGold = await prisma.rank.upsert({
    where: { rankCode: 'RANK_GOLD' },
    update: {},
    create: {
      rankCode: 'RANK_GOLD',
      name: 'Gold',
      level: 3,
      minPersonalBV: new Prisma.Decimal('200.00'),
      minGroupBV: new Prisma.Decimal('10000.00'),
      minActiveLegs: 2,
      binaryWeeklyCap: new Prisma.Decimal('10000.00'),
      oneTimeBonus: new Prisma.Decimal('500.00'),
    },
  });

  const rankPlatinum = await prisma.rank.upsert({
    where: { rankCode: 'RANK_PLATINUM' },
    update: {},
    create: {
      rankCode: 'RANK_PLATINUM',
      name: 'Platinum',
      level: 4,
      minPersonalBV: new Prisma.Decimal('300.00'),
      minGroupBV: new Prisma.Decimal('50000.00'),
      minActiveLegs: 4,
      binaryWeeklyCap: new Prisma.Decimal('25000.00'),
      oneTimeBonus: new Prisma.Decimal('1500.00'),
    },
  });

  const rankDiamond = await prisma.rank.upsert({
    where: { rankCode: 'RANK_DIAMOND' },
    update: {},
    create: {
      rankCode: 'RANK_DIAMOND',
      name: 'Diamond',
      level: 5,
      minPersonalBV: new Prisma.Decimal('500.00'),
      minGroupBV: new Prisma.Decimal('200000.00'),
      minActiveLegs: 4,
      binaryWeeklyCap: new Prisma.Decimal('100000.00'),
      oneTimeBonus: new Prisma.Decimal('5000.00'),
    },
  });

  // 3. Commission Rules
  await prisma.commissionRule.upsert({
    where: { ruleCode: 'BINARY_TEAM_MATCH_10' },
    update: {},
    create: {
      ruleCode: 'BINARY_TEAM_MATCH_10',
      name: 'Binary Team Matching Commission (10%)',
      type: 'BINARY_MATCH',
      percentage: new Prisma.Decimal('10.00'),
      minPersonalBV: new Prisma.Decimal('100.00'),
      minGroupBV: new Prisma.Decimal('300.00'),
      maxPayoutCap: new Prisma.Decimal('100000.00'),
      isActive: true,
      parameters: { matchRatio: '1:1', cycleThreshold: 300 },
    },
  });

  await prisma.commissionRule.upsert({
    where: { ruleCode: 'DIRECT_REFERRAL_20' },
    update: {},
    create: {
      ruleCode: 'DIRECT_REFERRAL_20',
      name: 'Direct Sponsor Fast Start Bonus (20%)',
      type: 'DIRECT_REFERRAL',
      percentage: new Prisma.Decimal('20.00'),
      minPersonalBV: new Prisma.Decimal('50.00'),
      isActive: true,
      parameters: { appliesToFirstOrderOnly: true },
    },
  });

  await prisma.commissionRule.upsert({
    where: { ruleCode: 'LEADERSHIP_CHECK_MATCH_10' },
    update: {},
    create: {
      ruleCode: 'LEADERSHIP_CHECK_MATCH_10',
      name: 'Leadership Check Match Level 1 (10%)',
      type: 'MATCHING_BONUS',
      percentage: new Prisma.Decimal('10.00'),
      rankRequiredId: rankSilver.id,
      isActive: true,
      parameters: { maxLevel: 1 },
    },
  });

  // 4. Admin User
  const adminPassword = await hashPassword('AdminSecurePass123!');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@kashvimlm.internal' },
    update: {},
    create: {
      email: 'admin@kashvimlm.internal',
      passwordHash: adminPassword,
      roleId: adminRole.id,
      roleName: 'ADMIN',
      phone: '+1-555-0199',
      isActive: true,
      emailVerifiedAt: new Date(),
      securityProfile: {
        create: {
          twoFactorEnabled: false,
        },
      },
    },
  });

  // 5. Distributors with Multi-Business Centers & Binary Placement Separation
  // Distributor 1 (Root Sponsor / Top Leader)
  const distPassword = await hashPassword('DistributorPass123!');
  const topUser = await prisma.user.upsert({
    where: { email: 'topdistributor@kashvimlm.internal' },
    update: {},
    create: {
      email: 'topdistributor@kashvimlm.internal',
      passwordHash: distPassword,
      roleId: distributorRole.id,
      roleName: 'DISTRIBUTOR',
      phone: '+1-555-0101',
      isActive: true,
      emailVerifiedAt: new Date(),
      wallet: {
        create: {
          balance: new Prisma.Decimal('1250.00'),
          totalEarned: new Prisma.Decimal('5400.00'),
          totalWithdrawn: new Prisma.Decimal('4150.00'),
        },
      },
      securityProfile: {
        create: {
          twoFactorEnabled: false,
        },
      },
    },
  });

  const topDistributor = await prisma.distributorProfile.upsert({
    where: { userId: topUser.id },
    update: {},
    create: {
      userId: topUser.id,
      distributorCode: 'DST-10001',
      firstName: 'Jordan',
      lastName: 'Miller',
      displayName: 'Jordan Miller (Master)',
      status: 'ACTIVE',
      currentRankId: rankGold.id,
      highestRankId: rankGold.id,
      lifetimePV: new Prisma.Decimal('1500.00'),
      lifetimeGV: new Prisma.Decimal('45000.00'),
      activatedAt: new Date(),
    },
  });

  // Multiple Business Centers for Top Distributor: BC1, BC2, BC3
  const topBC1 = await prisma.businessCenter.upsert({
    where: { centerCode: 'DST-10001-BC1' },
    update: {},
    create: {
      distributorId: topDistributor.id,
      centerNumber: 1,
      centerCode: 'DST-10001-BC1',
      status: 'ACTIVE',
      leftVolume: new Prisma.Decimal('12000.00'),
      rightVolume: new Prisma.Decimal('9500.00'),
    },
  });

  await prisma.businessCenter.upsert({
    where: { centerCode: 'DST-10001-BC2' },
    update: {},
    create: {
      distributorId: topDistributor.id,
      centerNumber: 2,
      centerCode: 'DST-10001-BC2',
      status: 'ACTIVE',
      leftVolume: new Prisma.Decimal('4500.00'),
      rightVolume: new Prisma.Decimal('3800.00'),
    },
  });

  await prisma.businessCenter.upsert({
    where: { centerCode: 'DST-10001-BC3' },
    update: {},
    create: {
      distributorId: topDistributor.id,
      centerNumber: 3,
      centerCode: 'DST-10001-BC3',
      status: 'ACTIVE',
      leftVolume: new Prisma.Decimal('2100.00'),
      rightVolume: new Prisma.Decimal('1900.00'),
    },
  });

  // Root Node in Binary Tree for Top Distributor BC1
  const rootNode = await prisma.mLMNode.upsert({
    where: { businessCenterId: topBC1.id },
    update: {},
    create: {
      businessCenterId: topBC1.id,
      distributorId: topDistributor.id,
      depth: 0,
      binaryPath: 'ROOT',
    },
  });

  // Distributor 2 (Sponsored by DST-10001, Placed LEFT under rootNode)
  const leftUser = await prisma.user.upsert({
    where: { email: 'distributor.left@kashvimlm.internal' },
    update: {},
    create: {
      email: 'distributor.left@kashvimlm.internal',
      passwordHash: distPassword,
      roleId: distributorRole.id,
      roleName: 'DISTRIBUTOR',
      phone: '+1-555-0102',
      isActive: true,
      wallet: {
        create: {
          balance: new Prisma.Decimal('450.00'),
        },
      },
    },
  });

  const leftDistributor = await prisma.distributorProfile.upsert({
    where: { userId: leftUser.id },
    update: {},
    create: {
      userId: leftUser.id,
      distributorCode: 'DST-10002',
      firstName: 'Samantha',
      lastName: 'Reed',
      displayName: 'Samantha Reed',
      status: 'ACTIVE',
      sponsorId: topDistributor.id, // Enroller / Sponsor
      currentRankId: rankSilver.id,
      highestRankId: rankSilver.id,
      lifetimePV: new Prisma.Decimal('500.00'),
      lifetimeGV: new Prisma.Decimal('12000.00'),
      activatedAt: new Date(),
    },
  });

  const leftBC1 = await prisma.businessCenter.upsert({
    where: { centerCode: 'DST-10002-BC1' },
    update: {},
    create: {
      distributorId: leftDistributor.id,
      centerNumber: 1,
      centerCode: 'DST-10002-BC1',
      status: 'ACTIVE',
      leftVolume: new Prisma.Decimal('6000.00'),
      rightVolume: new Prisma.Decimal('5500.00'),
    },
  });

  // Placed on LEFT of rootNode in Binary Tree
  await prisma.mLMNode.upsert({
    where: { businessCenterId: leftBC1.id },
    update: {},
    create: {
      businessCenterId: leftBC1.id,
      distributorId: leftDistributor.id,
      placementParentId: rootNode.id,
      placementPosition: 'LEFT',
      depth: 1,
      binaryPath: 'ROOT/L',
    },
  });

  // Record Sponsor Relationship Lineage
  await prisma.sponsorRelationship.upsert({
    where: {
      ancestorId_descendantId: {
        ancestorId: topDistributor.id,
        descendantId: leftDistributor.id,
      },
    },
    update: {},
    create: {
      ancestorId: topDistributor.id,
      descendantId: leftDistributor.id,
      depth: 1,
      isDirect: true,
    },
  });

  // Distributor 3 (Sponsored by DST-10001, Placed RIGHT under rootNode)
  const rightUser = await prisma.user.upsert({
    where: { email: 'distributor.right@kashvimlm.internal' },
    update: {},
    create: {
      email: 'distributor.right@kashvimlm.internal',
      passwordHash: distPassword,
      roleId: distributorRole.id,
      roleName: 'DISTRIBUTOR',
      phone: '+1-555-0103',
      isActive: true,
      wallet: {
        create: {
          balance: new Prisma.Decimal('280.00'),
        },
      },
    },
  });

  const rightDistributor = await prisma.distributorProfile.upsert({
    where: { userId: rightUser.id },
    update: {},
    create: {
      userId: rightUser.id,
      distributorCode: 'DST-10003',
      firstName: 'David',
      lastName: 'Chen',
      displayName: 'David Chen',
      status: 'ACTIVE',
      sponsorId: topDistributor.id, // Enroller / Sponsor
      currentRankId: rankBronze.id,
      highestRankId: rankBronze.id,
      lifetimePV: new Prisma.Decimal('300.00'),
      lifetimeGV: new Prisma.Decimal('9500.00'),
      activatedAt: new Date(),
    },
  });

  const rightBC1 = await prisma.businessCenter.upsert({
    where: { centerCode: 'DST-10003-BC1' },
    update: {},
    create: {
      distributorId: rightDistributor.id,
      centerNumber: 1,
      centerCode: 'DST-10003-BC1',
      status: 'ACTIVE',
      leftVolume: new Prisma.Decimal('4200.00'),
      rightVolume: new Prisma.Decimal('4800.00'),
    },
  });

  // Placed on RIGHT of rootNode in Binary Tree
  await prisma.mLMNode.upsert({
    where: { businessCenterId: rightBC1.id },
    update: {},
    create: {
      businessCenterId: rightBC1.id,
      distributorId: rightDistributor.id,
      placementParentId: rootNode.id,
      placementPosition: 'RIGHT',
      depth: 1,
      binaryPath: 'ROOT/R',
    },
  });

  await prisma.sponsorRelationship.upsert({
    where: {
      ancestorId_descendantId: {
        ancestorId: topDistributor.id,
        descendantId: rightDistributor.id,
      },
    },
    update: {},
    create: {
      ancestorId: topDistributor.id,
      descendantId: rightDistributor.id,
      depth: 1,
      isDirect: true,
    },
  });

  // 6. Preferred Customer
  const custPassword = await hashPassword('CustomerPass123!');
  const custUser = await prisma.user.upsert({
    where: { email: 'preferred.customer@kashvimlm.internal' },
    update: {},
    create: {
      email: 'preferred.customer@kashvimlm.internal',
      passwordHash: custPassword,
      roleId: customerRole.id,
      roleName: 'CUSTOMER',
      phone: '+1-555-0104',
      isActive: true,
    },
  });

  await prisma.customer.upsert({
    where: { userId: custUser.id },
    update: {},
    create: {
      userId: custUser.id,
      customerCode: 'CUST-20001',
      sponsorId: topDistributor.id,
      isPreferred: true,
    },
  });

  // 7. Product Categories
  const catWellness = await prisma.productCategory.upsert({
    where: { slug: 'wellness-nutrition' },
    update: {},
    create: {
      name: 'Wellness & Nutrition',
      slug: 'wellness-nutrition',
      description: 'Daily health, dietary supplements, and cellular nutrition products',
    },
  });

  const catBeauty = await prisma.productCategory.upsert({
    where: { slug: 'beauty-skincare' },
    update: {},
    create: {
      name: 'Beauty & Skincare',
      slug: 'beauty-skincare',
      description: 'High-performance botanical skincare and cosmetic formulas',
    },
  });

  const catStarterKits = await prisma.productCategory.upsert({
    where: { slug: 'starter-kits' },
    update: {},
    create: {
      name: 'Business Starter Kits',
      slug: 'starter-kits',
      description: 'Official distributor enrollment and promotional packs',
    },
  });

  const catClothesHosiery = await prisma.productCategory.upsert({
    where: { slug: 'clothes-hosiery' },
    update: { categoryCode: 'CLOTHES_HOSIERY' },
    create: {
      categoryCode: 'CLOTHES_HOSIERY',
      name: 'Clothes & Hosiery',
      slug: 'clothes-hosiery',
      description: 'Premium apparel, activewear, thermal base layers, and therapeutic compression hosiery',
      isActive: true,
      displayOrder: 1,
    },
  });

  const catElectronics = await prisma.productCategory.upsert({
    where: { slug: 'electronics-smart-devices' },
    update: { categoryCode: 'ELECTRONICS_SMART_DEVICES' },
    create: {
      categoryCode: 'ELECTRONICS_SMART_DEVICES',
      name: 'Electronics & Smart Devices',
      slug: 'electronics-smart-devices',
      description: 'Smart wearables, health tracking monitors, bio-impedance scales, and IoT wellness devices',
      isActive: true,
      displayOrder: 2,
    },
  });

  // 8. Sample Products
  await prisma.product.upsert({
    where: { sku: 'KIT-ENT-001' },
    update: {},
    create: {
      categoryId: catStarterKits.id,
      sku: 'KIT-ENT-001',
      name: 'Executive Business Enrollment Pack',
      slug: 'executive-business-enrollment-pack',
      description: 'Includes 3 Business Centers, sample inventory pack, marketing materials, and portal access.',
      retailPrice: new Prisma.Decimal('299.99'),
      distributorPrice: new Prisma.Decimal('249.99'),
      bv: new Prisma.Decimal('200.00'),
      status: 'ACTIVE',
      inventory: {
        create: {
          quantityOnHand: 250,
          quantityReserved: 10,
          reorderThreshold: 25,
        },
      },
    },
  });

  await prisma.product.upsert({
    where: { sku: 'SUPP-CELL-001' },
    update: {},
    create: {
      categoryId: catWellness.id,
      sku: 'SUPP-CELL-001',
      name: 'Cellular Synergy Antioxidant Matrix',
      slug: 'cellular-synergy-antioxidant-matrix',
      description: 'Proprietary antioxidant blend supporting immune function, mitochondrial energy, and wellness.',
      retailPrice: new Prisma.Decimal('69.99'),
      distributorPrice: new Prisma.Decimal('49.99'),
      bv: new Prisma.Decimal('40.00'),
      status: 'ACTIVE',
      inventory: {
        create: {
          quantityOnHand: 1500,
          quantityReserved: 45,
          reorderThreshold: 100,
        },
      },
    },
  });

  await prisma.product.upsert({
    where: { sku: 'SKN-BIO-001' },
    update: {},
    create: {
      categoryId: catBeauty.id,
      sku: 'SKN-BIO-001',
      name: 'Bio-Peptide Radiance Renewal Serum',
      slug: 'bio-peptide-radiance-renewal-serum',
      description: 'Age-defying peptide complex formulated to brighten skin tone and smooth texture.',
      wholesalePrice: new Prisma.Decimal('64.99'),
      mrp: new Prisma.Decimal('89.99'),
      retailPrice: new Prisma.Decimal('89.99'),
      distributorPrice: new Prisma.Decimal('64.99'),
      bv: new Prisma.Decimal('50.00'),
      stock: 800,
      lowStockThreshold: 50,
      status: 'ACTIVE',
      isFeatured: false,
      inventory: {
        create: {
          quantityOnHand: 800,
          quantityReserved: 20,
          reorderThreshold: 50,
        },
      },
    },
  });

  await prisma.product.upsert({
    where: { sku: 'CLO-COMP-001' },
    update: {},
    create: {
      categoryId: catClothesHosiery.id,
      sku: 'CLO-COMP-001',
      name: 'ActiveFit Graduated Compression Hosiery Pro',
      slug: 'activefit-graduated-compression-hosiery-pro',
      description: 'Medical-grade graduated compression hosiery designed for optimal blood circulation, leg energy, and fast muscle recovery.',
      wholesalePrice: new Prisma.Decimal('29.99'),
      mrp: new Prisma.Decimal('49.99'),
      retailPrice: new Prisma.Decimal('49.99'),
      distributorPrice: new Prisma.Decimal('29.99'),
      bv: new Prisma.Decimal('25.00'),
      stock: 500,
      lowStockThreshold: 30,
      status: 'ACTIVE',
      isFeatured: true,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&w=800&q=80',
            altText: 'ActiveFit Compression Hosiery Front',
            isPrimary: true,
            displayOrder: 0,
          },
        ],
      },
      inventory: {
        create: {
          quantityOnHand: 500,
          quantityReserved: 5,
          reorderThreshold: 30,
        },
      },
    },
  });

  await prisma.product.upsert({
    where: { sku: 'ELE-BAND-001' },
    update: {},
    create: {
      categoryId: catElectronics.id,
      sku: 'ELE-BAND-001',
      name: 'Kashvi Smart Vitality Health Band 4',
      slug: 'kashvi-smart-vitality-health-band-4',
      description: 'Continuous biometric monitor with 24/7 heart rate, SpO2 blood oxygen, HRV, stress tracking, and 14-day ultra battery life.',
      wholesalePrice: new Prisma.Decimal('89.99'),
      mrp: new Prisma.Decimal('149.99'),
      retailPrice: new Prisma.Decimal('149.99'),
      distributorPrice: new Prisma.Decimal('89.99'),
      bv: new Prisma.Decimal('75.00'),
      stock: 250,
      lowStockThreshold: 25,
      status: 'ACTIVE',
      isFeatured: true,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
            altText: 'Kashvi Smart Vitality Band Display',
            isPrimary: true,
            displayOrder: 0,
          },
        ],
      },
      inventory: {
        create: {
          quantityOnHand: 250,
          quantityReserved: 12,
          reorderThreshold: 25,
        },
      },
    },
  });

  // 9. Sample News & Announcements
  await prisma.news.upsert({
    where: { slug: 'welcome-to-kashvimlm-platform' },
    update: {},
    create: {
      slug: 'welcome-to-kashvimlm-platform',
      title: 'Welcome to the Next-Generation Kashvimlm Platform',
      summary: 'State-of-the-art distributor management, instant genealogy tracking, and automated commissions.',
      content: 'We are thrilled to unveil the new Kashvimlm enterprise distributor management infrastructure featuring real-time binary placement, multiple business center support, and transparent e-wallet payouts.',
      isPublished: true,
      targetAudience: 'ALL',
    },
  });

  // 10. Sample Training Course & Lessons
  const course = await prisma.trainingCourse.upsert({
    where: { slug: 'distributor-quick-start' },
    update: {},
    create: {
      slug: 'distributor-quick-start',
      title: 'Distributor Quick Start Blueprint',
      description: 'Master the fundamentals of your virtual office, binary structure, and compensation plan.',
      isMandatory: true,
      displayOrder: 1,
      lessons: {
        create: [
          {
            title: 'Lesson 1: Understanding Sponsor vs Binary Placement',
            content: 'Learn why your direct sponsor tree and your binary tree placement parent operate independently, and how dual business centers drive volume matching.',
            durationMinutes: 15,
            displayOrder: 1,
          },
          {
            title: 'Lesson 2: Qualifying for Weekly Binary Commissions',
            content: 'How to maintain active personal volume (PV) and balance left and right leg group volume (GV) to maximize weekly commission cycles.',
            durationMinutes: 20,
            displayOrder: 2,
          },
        ],
      },
    },
  });

  // 11. System Settings
  const settings = [
    { key: 'BINARY_MATCH_PERCENTAGE', value: '10.00', dataType: 'DECIMAL', category: 'COMPENSATION' },
    { key: 'DEFAULT_SPONSOR_CODE', value: 'DST-10001', dataType: 'STRING', category: 'SYSTEM' },
    { key: 'MIN_PAYOUT_AMOUNT', value: '50.00', dataType: 'DECIMAL', category: 'FINANCE' },
    { key: 'MAX_BUSINESS_CENTERS', value: '3', dataType: 'INTEGER', category: 'COMPENSATION' },
    { key: 'AUTO_FLUSH_PERIOD_DAYS', value: '365', dataType: 'INTEGER', category: 'COMPENSATION' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  // eslint-disable-next-line no-console
  console.log('✅ Seeding completed successfully:');
  console.log(`   - Admin: ${adminUser.email}`);
  console.log(`   - Top Distributor: ${topUser.email} (${topDistributor.distributorCode})`);
  console.log(`   - Left Placed: ${leftUser.email} (${leftDistributor.distributorCode})`);
  console.log(`   - Right Placed: ${rightUser.email} (${rightDistributor.distributorCode})`);
  console.log(`   - Preferred Customer: ${custUser.email}`);
  console.log(`   - Course: ${course.title}`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('❌ Error during database seeding:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
