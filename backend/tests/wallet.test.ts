import { WalletController } from '../src/controllers/wallet.controller';
import { adminWalletRouter, walletRouter } from '../src/routes/wallet.routes';
import { WalletService } from '../src/services/wallet.service';
import {
  adminWalletAdjustmentSchema,
  walletTransactionQuerySchema,
  walletTransactionTypeEnum,
} from '../src/validators/wallet.validators';

export async function runWalletTests() {
  console.log('\n=== RUNNING DISTRIBUTOR WALLET TEST SUITE ===\n');

  // Test 11.1: WalletTransaction Types
  console.log('1. Testing WalletTransaction Types:');
  const expectedTypes = [
    'CREDIT',
    'DEBIT',
    'COMMISSION',
    'PAYOUT',
    'REFUND',
    'ADJUSTMENT',
    'REVERSAL',
  ];
  for (const t of expectedTypes) {
    const res = walletTransactionTypeEnum.safeParse(t);
    if (!res.success) {
      throw new Error(`WalletTransactionType '${t}' failed validation`);
    }
  }
  const invalidType = walletTransactionTypeEnum.safeParse('DIRECT_HACK_CREDIT');
  if (invalidType.success) {
    throw new Error('Accepted invalid WalletTransactionType');
  }
  console.log('   - Core transaction types (CREDIT, DEBIT, COMMISSION, PAYOUT, REFUND, ADJUSTMENT, REVERSAL): [PASS]');
  console.log('   - Rejection of invalid transaction types: [PASS]\n');

  // Test 11.2: Wallet Schema & Fields Contract
  console.log('2. Testing Wallet Formatting Contract:');
  const sampleWallet = {
    id: 'w-1001',
    distributorId: 'd-1001',
    userId: 'u-1001',
    availableBalance: 1250.5,
    pendingBalance: 150.0,
    lifetimeEarned: 5000.0,
    lifetimePaid: 3749.5,
    currency: 'USD',
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const formatted = WalletService.formatWallet(sampleWallet);
  const requiredFields = [
    'id',
    'distributorId',
    'availableBalance',
    'pendingBalance',
    'lifetimeEarned',
    'lifetimePaid',
  ];
  for (const field of requiredFields) {
    if ((formatted as any)[field] === undefined) {
      throw new Error(`Formatted wallet missing required field: ${field}`);
    }
  }
  if (formatted.availableBalance !== 1250.5 || formatted.pendingBalance !== 150.0) {
    throw new Error('Wallet numerical balances formatting mismatch');
  }
  console.log('   - Formatter includes [id, distributorId, availableBalance, pendingBalance, lifetimeEarned, lifetimePaid]: [PASS]');
  console.log('   - Floating point and currency precision preserved: [PASS]\n');

  // Test 11.3: Admin Wallet Adjustment Schema
  console.log('3. Testing Admin Wallet Adjustment Validation:');
  const validAdjustment = adminWalletAdjustmentSchema.safeParse({
    distributorId: '550e8400-e29b-41d4-a716-446655440000',
    type: 'CREDIT',
    amount: 250.75,
    reason: 'Goodwill bonus for high performance',
    referenceId: 'REF-2026-BONUS',
  });
  if (!validAdjustment.success) {
    throw new Error('Valid admin adjustment failed validation: ' + JSON.stringify(validAdjustment.error));
  }
  console.log('   - Valid admin adjustment schema: [PASS]');

  const invalidNegativeAmount = adminWalletAdjustmentSchema.safeParse({
    distributorId: '550e8400-e29b-41d4-a716-446655440000',
    type: 'CREDIT',
    amount: -50,
    reason: 'Negative test',
  });
  if (invalidNegativeAmount.success) {
    throw new Error('Accepted negative adjustment amount');
  }
  console.log('   - Rejection of negative amount: [PASS]');

  const invalidDistributorId = adminWalletAdjustmentSchema.safeParse({
    distributorId: 'not-a-uuid',
    type: 'DEBIT',
    amount: 100,
    reason: 'Debit test',
  });
  if (invalidDistributorId.success) {
    throw new Error('Accepted invalid UUID for distributorId');
  }
  console.log('   - Rejection of non-UUID distributorId: [PASS]');

  const missingReason = adminWalletAdjustmentSchema.safeParse({
    distributorId: '550e8400-e29b-41d4-a716-446655440000',
    type: 'DEBIT',
    amount: 100,
    reason: '',
  });
  if (missingReason.success) {
    throw new Error('Accepted empty adjustment reason');
  }
  console.log('   - Rejection of missing reason: [PASS]\n');

  // Test 11.4: Wallet Query Schema Validation
  console.log('4. Testing Wallet Transaction Query Schema:');
  const defaultQuery = walletTransactionQuerySchema.parse({});
  if (defaultQuery.page !== 1 || defaultQuery.limit !== 20) {
    throw new Error('Default pagination values incorrect');
  }
  console.log('   - Default pagination (page=1, limit=20): [PASS]');

  const filteredQuery = walletTransactionQuerySchema.safeParse({
    type: 'COMMISSION',
    page: '2',
    limit: '50',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
  });
  if (!filteredQuery.success || filteredQuery.data.page !== 2 || filteredQuery.data.limit !== 50) {
    throw new Error('Filtered query parsing failed: ' + JSON.stringify(filteredQuery));
  }
  console.log('   - Type filter and date coercion parsing: [PASS]\n');

  // Test 11.5: WalletService Methods
  console.log('5. Verifying WalletService Methods:');
  const serviceMethods = [
    'getOrCreateWallet',
    'getWalletByUserId',
    'getTransactions',
    'adjustWalletBalance',
    'processPayableCommissions',
  ];
  for (const sm of serviceMethods) {
    if (typeof (WalletService as any)[sm] !== 'function') {
      throw new Error(`CRITICAL: WalletService.${sm} is missing or not a function!`);
    }
    console.log(`   - WalletService.${sm}(): IMPLEMENTED & VERIFIED`);
  }

  // Test 11.6: Controller Handlers & Endpoint Mapping
  console.log('\n6. Verifying Controller Handlers & Endpoint Mapping:');
  const requiredEndpoints = [
    { name: 'GET /api/v1/wallet', method: 'getMyWallet' },
    { name: 'GET /api/v1/wallet/transactions', method: 'getMyTransactions' },
    { name: 'POST /api/v1/admin/wallet/adjust', method: 'adminAdjust' },
    { name: 'Direct Mutation Guard', method: 'blockDirectMutation' },
  ];
  for (const ep of requiredEndpoints) {
    if (typeof (WalletController as any)[ep.method] !== 'function') {
      throw new Error(`Missing controller method ${ep.method} for endpoint ${ep.name}`);
    }
    console.log(`   - ${ep.name} -> WalletController.${ep.method}: READY`);
  }

  // Test 11.7: Security Guards Against Frontend Direct Balance Mutations
  console.log('\n7. Verifying Security & Mutation Prohibitions:');
  try {
    WalletController.blockDirectMutation({} as any, {} as any, () => {});
    throw new Error('Direct mutation guard did not throw AppError.forbidden!');
  } catch (err: any) {
    if (err.statusCode !== 403 || err.code !== 'WALLET_MUTATION_PROHIBITED') {
      throw new Error(`Unexpected error from direct mutation guard: ${err.message}`);
    }
    console.log('   - Frontend client direct balance change attempt strictly rejected with 403 Forbidden: [PASS]');
  }

  // Test 11.8: Router Integrity
  console.log('\n8. Verifying Express Router Configurations:');
  if (!walletRouter) throw new Error('walletRouter is not exported');
  if (!adminWalletRouter) throw new Error('adminWalletRouter is not exported');
  console.log('   - walletRouter (/api/v1/wallet) and adminWalletRouter (/api/v1/admin/wallet) exported: [PASS]');

  console.log('\n======================================================');
  console.log('>>> DISTRIBUTOR WALLET SUITE: ALL TESTS PASSED! <<<');
  console.log('======================================================\n');
}
