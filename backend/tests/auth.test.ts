/**
 * Test Suite: Authentication, Argon2id Hashing, JWT Tokens & Rate Limiting
 */
import { hashPassword, verifyPassword } from '../src/utils/password';
import { hashToken, signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../src/utils/jwt';
import { AuthService } from '../src/services/auth.service';

describe('Auth Service & Security Utilities', () => {
  describe('Argon2id Password Hashing', () => {
    it('should hash passwords with Argon2id and verify correctly', async () => {
      const plainPassword = 'SuperSecurePassword@2026';
      const hash = await hashPassword(plainPassword);

      // Must not be plain text
      expect(hash).not.toBe(plainPassword);
      // Argon2id signature prefix
      expect(hash).toContain('$argon2id$');

      // Verify correct password returns true
      const isMatch = await verifyPassword(plainPassword, hash);
      expect(isMatch).toBe(true);

      // Verify incorrect password returns false
      const isWrongMatch = await verifyPassword('WrongPassword123!', hash);
      expect(isWrongMatch).toBe(false);
    });
  });

  describe('JWT Access & Refresh Tokens', () => {
    it('should sign and verify access token with user role and account status', () => {
      const payload = {
        sub: 'test-user-id-1234',
        email: 'member@kashvimlm.internal',
        role: 'DISTRIBUTOR' as const,
        status: 'ACTIVE' as const,
      };

      const token = signAccessToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);

      const decoded = verifyAccessToken(token);
      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.status).toBe(payload.status);
    });

    it('should sign and verify refresh token with session family tracking', () => {
      const refreshPayload = {
        sub: 'test-user-id-1234',
        sessionId: 'session-uuid-5678',
        family: 'family-uuid-9999',
      };

      const refreshToken = signRefreshToken(refreshPayload);
      expect(typeof refreshToken).toBe('string');

      const decoded = verifyRefreshToken(refreshToken);
      expect(decoded.sub).toBe(refreshPayload.sub);
      expect(decoded.sessionId).toBe(refreshPayload.sessionId);
      expect(decoded.family).toBe(refreshPayload.family);
    });

    it('should securely hash tokens using SHA-256 for database storage', () => {
      const rawToken = 'sample_refresh_token_string_123';
      const hash1 = hashToken(rawToken);
      const hash2 = hashToken(rawToken);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // 256-bit hex
      expect(hash1).not.toBe(rawToken);
    });
  });

  describe('Auth Service Structure', () => {
    it('should have all authentication methods defined', () => {
      expect(AuthService.register).toBeDefined();
      expect(AuthService.login).toBeDefined();
      expect(AuthService.refreshToken).toBeDefined();
      expect(AuthService.logout).toBeDefined();
      expect(AuthService.getMe).toBeDefined();
      expect(AuthService.forgotPassword).toBeDefined();
      expect(AuthService.resetPassword).toBeDefined();
    });
  });
});
