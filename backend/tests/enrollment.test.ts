/**
 * Test Suite: Distributor & Customer Enrollment Pipeline
 * Tests all 5 enrollment steps, Zod validation, binary tree constraints,
 * sensitive data masking, and Argon2id PIN hashing.
 */
import { maskAccountNumber, maskEmail, maskIfsc, maskPhone, sanitizeEnrollmentResponse } from '../src/utils/masking';
import { hashPassword, verifyPassword } from '../src/utils/password';
import {
  createEnrollmentSchema,
  step1PersonalInfoSchema,
  step2AddressSchema,
  step3TreePlacementSchema,
  step4StarterKitSchema,
  step5BankSecuritySchema,
} from '../validators/enrollment.validators';
import { EnrollmentService } from '../src/services/enrollment.service';

describe('Enrollment Pipeline & Validation Suite', () => {
  describe('Zod Validation for Enrollment Steps', () => {
    describe('Step 1: Personal Info Schema', () => {
      it('should validate valid personal info for 18+ individual', () => {
        const validData = {
          legalName: 'Alexander Hamilton',
          email: 'alex.hamilton@example.com',
          mobile: '+1 (555) 234-5678',
          dateOfBirth: '1995-01-11',
        };

        const parsed = step1PersonalInfoSchema.safeParse(validData);
        expect(parsed.success).toBe(true);
      });

      it('should reject underage prospects (< 18 years old)', () => {
        const today = new Date();
        const underageDob = `${today.getFullYear() - 15}-05-15`;

        const parsed = step1PersonalInfoSchema.safeParse({
          legalName: 'Minor Individual',
          email: 'minor@example.com',
          mobile: '5551234567',
          dateOfBirth: underageDob,
        });

        expect(parsed.success).toBe(false);
        if (!parsed.success) {
          expect(parsed.error.errors[0].message).toContain('at least 18 years old');
        }
      });

      it('should reject invalid email format', () => {
        const parsed = step1PersonalInfoSchema.safeParse({
          legalName: 'Jane Doe',
          email: 'not-an-email',
          mobile: '5551234567',
          dateOfBirth: '1990-05-20',
        });

        expect(parsed.success).toBe(false);
      });
    });

    describe('Step 2: Address & PIN Schema', () => {
      it('should validate complete postal address', () => {
        const validAddress = {
          address: '742 Evergreen Terrace',
          city: 'Springfield',
          state: 'OR',
          country: 'USA',
          postalCode: '97477',
        };

        const parsed = step2AddressSchema.safeParse(validAddress);
        expect(parsed.success).toBe(true);
      });

      it('should reject missing required address fields', () => {
        const parsed = step2AddressSchema.safeParse({
          address: 'Too short',
          city: '',
          state: '',
          country: '',
          postalCode: '',
        });

        expect(parsed.success).toBe(false);
      });
    });

    describe('Step 3: Tree Placement Schema', () => {
      it('should validate valid sponsor, placement parent, and position', () => {
        const validPlacement = {
          sponsor: 'DST-10001',
          placementParent: 'DST-10002',
          placementPosition: 'LEFT',
        };

        const parsed = step3TreePlacementSchema.safeParse(validPlacement);
        expect(parsed.success).toBe(true);
      });

      it('should only accept LEFT or RIGHT as placement positions', () => {
        const parsed = step3TreePlacementSchema.safeParse({
          sponsor: 'DST-10001',
          placementParent: 'DST-10002',
          placementPosition: 'MIDDLE',
        });

        expect(parsed.success).toBe(false);
      });
    });

    describe('Step 4: Starter Kit Schema', () => {
      it('should validate starter kit with positive price and BV', () => {
        const validKit = {
          productPackage: 'Executive Business Enrollment Pack',
          price: 249.99,
          bv: 200,
        };

        const parsed = step4StarterKitSchema.safeParse(validKit);
        expect(parsed.success).toBe(true);
      });

      it('should reject negative or zero price', () => {
        const parsed = step4StarterKitSchema.safeParse({
          productPackage: 'Free Package',
          price: -10,
          bv: 50,
        });

        expect(parsed.success).toBe(false);
      });
    });

    describe('Step 5: Bank & Security Schema', () => {
      it('should validate bank credentials and 4-6 digit numeric PIN', () => {
        const validBank = {
          accountHolder: 'Alexander Hamilton',
          bankName: 'JPMorgan Chase',
          accountNumber: '987654321098',
          ifsc: 'CHASUS33',
          securityPin: '4829',
        };

        const parsed = step5BankSecuritySchema.safeParse(validBank);
        expect(parsed.success).toBe(true);
      });

      it('should reject non-numeric or invalid length security PINs', () => {
        const parsedAlpha = step5BankSecuritySchema.safeParse({
          accountHolder: 'Alexander Hamilton',
          bankName: 'Chase',
          accountNumber: '987654321',
          ifsc: 'CHASUS33',
          securityPin: 'abcd',
        });
        expect(parsedAlpha.success).toBe(false);

        const parsedTooShort = step5BankSecuritySchema.safeParse({
          accountHolder: 'Alexander Hamilton',
          bankName: 'Chase',
          accountNumber: '987654321',
          ifsc: 'CHASUS33',
          securityPin: '12',
        });
        expect(parsedTooShort.success).toBe(false);
      });
    });
  });

  describe('Security & Sensitive Data Masking', () => {
    it('should mask bank account numbers preserving only last 4 digits', () => {
      expect(maskAccountNumber('987654321098')).toBe('********1098');
      expect(maskAccountNumber('1234')).toBe('****');
      expect(maskAccountNumber('')).toBe('');
    });

    it('should mask IFSC / Routing codes', () => {
      const masked = maskIfsc('SBIN0001234');
      expect(masked.startsWith('SBIN')).toBe(true);
      expect(masked.endsWith('34')).toBe(true);
      expect(masked).toContain('*');
    });

    it('should mask emails and phone numbers', () => {
      const maskedEmail = maskEmail('alexander.hamilton@example.com');
      expect(maskedEmail).toContain('@example.com');
      expect(maskedEmail).toContain('***');

      const maskedPhone = maskPhone('+15552345678');
      expect(maskedPhone.endsWith('5678')).toBe(true);
      expect(maskedPhone.startsWith('*')).toBe(true);
    });

    it('should sanitize enrollment payload, removing raw PIN and hashes', () => {
      const rawEnrollment = {
        id: 'mock-enrollment-id',
        enrollmentNumber: 'ENR-123456',
        securityPinHash: '$argon2id$v=19$m=65536,t=3,p=1$secret_hash',
        steps: [
          {
            stepNumber: 1,
            stepName: 'Personal Info',
            stepData: { legalName: 'John Doe', email: 'john@example.com' },
          },
          {
            stepNumber: 5,
            stepName: 'Bank & Security',
            stepData: {
              accountHolder: 'John Doe',
              bankName: 'City Bank',
              accountNumber: '112233445566',
              ifsc: 'CITI0001',
              securityPin: '1234',
              securityPinHash: '$argon2id$...',
            },
          },
        ],
      };

      const sanitized = sanitizeEnrollmentResponse(rawEnrollment);

      // Verify securityPinHash stripped at root
      expect(sanitized.securityPinHash).toBeUndefined();

      // Verify Step 5 bank details masked and PIN omitted
      const step5 = sanitized.steps.find((s: any) => s.stepNumber === 5);
      expect(step5.stepData.securityPin).toBeUndefined();
      expect(step5.stepData.securityPinHash).toBeUndefined();
      expect(step5.stepData.pinConfigured).toBe(true);
      expect(step5.stepData.accountNumber).toBe('********5566');
    });

    it('should securely hash security PIN using Argon2id', async () => {
      const pin = '5892';
      const hash = await hashPassword(pin);

      expect(hash).not.toBe(pin);
      expect(hash).toContain('$argon2id$');

      const isMatch = await verifyPassword(pin, hash);
      expect(isMatch).toBe(true);

      const isWrong = await verifyPassword('0000', hash);
      expect(isWrong).toBe(false);
    });
  });

  describe('Enrollment Service Structure', () => {
    it('should define all 9 required service methods', () => {
      expect(EnrollmentService.createEnrollment).toBeDefined();
      expect(EnrollmentService.getEnrollmentById).toBeDefined();
      expect(EnrollmentService.updateEnrollment).toBeDefined();
      expect(EnrollmentService.saveStep1).toBeDefined();
      expect(EnrollmentService.saveStep2).toBeDefined();
      expect(EnrollmentService.saveStep3).toBeDefined();
      expect(EnrollmentService.saveStep4).toBeDefined();
      expect(EnrollmentService.saveStep5).toBeDefined();
      expect(EnrollmentService.submitEnrollment).toBeDefined();
    });
  });
});
