/**
 * Test Suite: Enrollment Pipeline Automated Tests
 * Uses Vitest & Supertest
 *
 * Covers:
 * - Step validation (Steps 1 to 5)
 * - Duplicate email rejection
 * - Invalid sponsor rejection
 * - Invalid placement rejection
 * - Sensitive banking & PIN masking
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import {
  createEnrollmentSchema,
  step1PersonalInfoSchema,
  step2AddressSchema,
  step3TreePlacementSchema,
  step4StarterKitSchema,
  step5BankSecuritySchema,
} from '../src/validators/enrollment.validators';
import { EnrollmentService } from '../src/services/enrollment.service';
import { maskAccountNumber, maskEmail, maskIfsc, sanitizeEnrollmentResponse } from '../src/utils/masking';
import { AppError } from '../src/utils/appError';

describe('ENROLLMENT MODULE AUTOMATED TESTS (Supertest + Vitest)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Step Validation (Schemas & Boundaries)', () => {
    describe('Step 1: Personal Info & Age Requirements', () => {
      it('should accept valid applicant aged 18 or above', () => {
        const valid = step1PersonalInfoSchema.safeParse({
          legalName: 'Alexander Hamilton',
          email: 'alexander@example.com',
          mobile: '+1 (555) 234-5678',
          dateOfBirth: '1990-01-11',
        });
        expect(valid.success).toBe(true);
      });

      it('should reject applicant under 18 years old', () => {
        const today = new Date();
        const underageDob = `${today.getFullYear() - 16}-01-01`;

        const parsed = step1PersonalInfoSchema.safeParse({
          legalName: 'Minor Prospect',
          email: 'minor@example.com',
          mobile: '5551234567',
          dateOfBirth: underageDob,
        });

        expect(parsed.success).toBe(false);
        if (!parsed.success) {
          expect(parsed.error.errors[0].message).toContain('at least 18 years old');
        }
      });

      it('should reject invalid email formatting', () => {
        const parsed = step1PersonalInfoSchema.safeParse({
          legalName: 'John Doe',
          email: 'not-a-valid-email',
          mobile: '5551234567',
          dateOfBirth: '1990-05-15',
        });
        expect(parsed.success).toBe(false);
      });
    });

    describe('Step 2: Address & Geography', () => {
      it('should accept valid complete physical address', () => {
        const valid = step2AddressSchema.safeParse({
          address: '742 Evergreen Terrace',
          city: 'Springfield',
          state: 'OR',
          country: 'USA',
          postalCode: '97477',
        });
        expect(valid.success).toBe(true);
      });

      it('should reject empty or missing address fields', () => {
        const parsed = step2AddressSchema.safeParse({
          address: '',
          city: 'Springfield',
          state: 'OR',
          country: 'USA',
          postalCode: '',
        });
        expect(parsed.success).toBe(false);
      });
    });

    describe('Step 3: Tree Placement & Position Boundaries', () => {
      it('should accept valid LEFT or RIGHT placement position', () => {
        const leftPlacement = step3TreePlacementSchema.safeParse({
          sponsor: 'DST-10001',
          placementParent: 'DST-10002',
          placementPosition: 'LEFT',
        });
        expect(leftPlacement.success).toBe(true);

        const rightPlacement = step3TreePlacementSchema.safeParse({
          sponsor: 'DST-10001',
          placementParent: 'DST-10002',
          placementPosition: 'RIGHT',
        });
        expect(rightPlacement.success).toBe(true);
      });

      it('should reject invalid placement positions (e.g. MIDDLE, CENTER)', () => {
        const invalidPos = step3TreePlacementSchema.safeParse({
          sponsor: 'DST-10001',
          placementParent: 'DST-10002',
          placementPosition: 'MIDDLE' as any,
        });
        expect(invalidPos.success).toBe(false);
      });
    });

    describe('Step 4: Starter Kit Pricing & Volume', () => {
      it('should accept valid starter kit package with positive price and BV', () => {
        const valid = step4StarterKitSchema.safeParse({
          productPackage: 'Executive Business Pack',
          price: 299.99,
          bv: 250,
        });
        expect(valid.success).toBe(true);
      });

      it('should reject starter kit with negative or zero price', () => {
        const negativePrice = step4StarterKitSchema.safeParse({
          productPackage: 'Invalid Free Pack',
          price: -50,
          bv: 100,
        });
        expect(negativePrice.success).toBe(false);

        const zeroPrice = step4StarterKitSchema.safeParse({
          productPackage: 'Zero Price Pack',
          price: 0,
          bv: 100,
        });
        expect(zeroPrice.success).toBe(false);
      });
    });

    describe('Step 5: Bank Details & Security PIN', () => {
      it('should accept valid bank account and 4-digit numeric PIN', () => {
        const valid = step5BankSecuritySchema.safeParse({
          accountHolder: 'Alexander Hamilton',
          bankName: 'JPMorgan Chase',
          accountNumber: '987654321098',
          ifsc: 'CHASUS33',
          securityPin: '4829',
        });
        expect(valid.success).toBe(true);
      });

      it('should reject non-numeric or malformed security PIN', () => {
        const nonNumericPin = step5BankSecuritySchema.safeParse({
          accountHolder: 'Alexander Hamilton',
          bankName: 'JPMorgan Chase',
          accountNumber: '987654321098',
          ifsc: 'CHASUS33',
          securityPin: 'abcd',
        });
        expect(nonNumericPin.success).toBe(false);

        const shortPin = step5BankSecuritySchema.safeParse({
          accountHolder: 'Alexander Hamilton',
          bankName: 'JPMorgan Chase',
          accountNumber: '987654321098',
          ifsc: 'CHASUS33',
          securityPin: '12',
        });
        expect(shortPin.success).toBe(false);
      });
    });
  });

  describe('2. Duplicate Email & User Rejection', () => {
    it('should reject enrollment when prospect email already exists in system', async () => {
      vi.spyOn(EnrollmentService, 'createEnrollment').mockRejectedValue(
        AppError.conflict(
          'An account with this email address already exists. Please login instead.',
          'ENROLLMENT_USER_ALREADY_EXISTS'
        )
      );

      const res = await request(app)
        .post('/api/v1/enrollments')
        .send({
          sponsorId: 'DST-10001',
          prospectEmail: 'existing.user@kashvimlm.com',
          enrollmentType: 'DISTRIBUTOR',
        })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('3. Invalid Sponsor Rejection', () => {
    it('should reject enrollment when sponsor code does not exist', async () => {
      vi.spyOn(EnrollmentService, 'createEnrollment').mockRejectedValue(
        AppError.notFound(
          "Sponsor 'INVALID-SPONSOR-999' not found. Please verify the sponsor ID or distributor code.",
          'ENROLLMENT_SPONSOR_NOT_FOUND'
        )
      );

      const res = await request(app)
        .post('/api/v1/enrollments')
        .send({
          sponsorId: 'INVALID-SPONSOR-999',
          prospectEmail: 'newprospect@example.com',
          enrollmentType: 'DISTRIBUTOR',
        })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });

    it('should reject enrollment when sponsor is inactive', async () => {
      vi.spyOn(EnrollmentService, 'createEnrollment').mockRejectedValue(
        AppError.badRequest(
          'The specified sponsor account is not currently active.',
          'ENROLLMENT_SPONSOR_INACTIVE'
        )
      );

      const res = await request(app)
        .post('/api/v1/enrollments')
        .send({
          sponsorId: 'DST-INACTIVE-01',
          prospectEmail: 'newprospect@example.com',
          enrollmentType: 'DISTRIBUTOR',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not currently active');
    });
  });

  describe('4. Invalid Placement Rejection', () => {
    it('should reject Step 3 when placement parent is not found', async () => {
      const enrollmentId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

      vi.spyOn(EnrollmentService, 'saveStep3').mockRejectedValue(
        AppError.notFound(
          'Invalid parent: The specified placement parent node does not exist in the binary tree.',
          'ENROLLMENT_INVALID_PLACEMENT_PARENT'
        )
      );

      const res = await request(app)
        .post(`/api/v1/enrollments/${enrollmentId}/step/3`)
        .send({
          sponsor: 'DST-10001',
          placementParent: 'NONEXISTENT-PARENT',
          placementPosition: 'LEFT',
        })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('does not exist');
    });

    it('should reject Step 3 when target position is already occupied', async () => {
      const enrollmentId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

      vi.spyOn(EnrollmentService, 'saveStep3').mockRejectedValue(
        AppError.conflict(
          'The LEFT position under placement parent (ID: DST-10002) is already occupied.'
        )
      );

      const res = await request(app)
        .post(`/api/v1/enrollments/${enrollmentId}/step/3`)
        .send({
          sponsor: 'DST-10001',
          placementParent: 'DST-10002',
          placementPosition: 'LEFT',
        })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already occupied');
    });
  });

  describe('5. Data Sanitization & Financial Masking', () => {
    it('should mask bank account numbers showing only the last 4 digits', () => {
      const masked = maskAccountNumber('987654321098');
      expect(masked.endsWith('1098')).toBe(true);
      expect(masked.includes('****')).toBe(true);
      expect(masked).not.toBe('987654321098');
    });

    it('should strip raw security PIN and hash from enrollment response payload', () => {
      const rawEnrollment = {
        id: 'mock-enr-123',
        enrollmentNumber: 'ENR-123456',
        securityPinHash: '$argon2id$v=19$m=65536,t=3,p=1$secret_hash',
        steps: [
          {
            stepNumber: 5,
            stepName: 'Bank & Security',
            stepData: {
              accountHolder: 'Alexander Hamilton',
              accountNumber: '987654321098',
              ifsc: 'CHASUS33',
              securityPin: '4829',
              securityPinHash: 'secret_hash',
            },
          },
        ],
      };

      const sanitized = sanitizeEnrollmentResponse(rawEnrollment);
      expect((sanitized as any).securityPinHash).toBeUndefined();
      expect(sanitized.steps[0].stepData.securityPin).toBeUndefined();
      expect(sanitized.steps[0].stepData.securityPinHash).toBeUndefined();
      expect(sanitized.steps[0].stepData.accountNumber).toBe('********1098');
      expect(sanitized.steps[0].stepData.pinConfigured).toBe(true);
    });
  });
});
