import { randomBytes, randomUUID } from 'crypto';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AuthUser, JwtAccessPayload, JwtRefreshPayload } from '../types';
import { AppError } from '../utils/appError';
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { LoginInput, RegisterInput, ResetPasswordInput } from '../validators/auth.validators';

interface RequestMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export class AuthService {
  /**
   * Registers a new user (Distributor or Customer) with Argon2id hashing and initial token pair.
   */
  public static async register(input: RegisterInput, metadata: RequestMetadata = {}) {
    const { email, password, role, firstName, lastName, phone, sponsorCode } = input;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw AppError.conflict(
        'An account with this email address already exists.',
        'AUTH_EMAIL_ALREADY_EXISTS'
      );
    }

    // Resolve sponsor if provided
    let sponsorId: string | undefined;
    if (sponsorCode) {
      const sponsor = await prisma.distributorProfile.findUnique({
        where: { distributorCode: sponsorCode },
      });
      if (!sponsor) {
        throw AppError.badRequest(
          `Invalid sponsor code '${sponsorCode}'. Sponsor not found.`,
          'AUTH_INVALID_SPONSOR'
        );
      }
      sponsorId = sponsor.id;
    }

    // Hash password with Argon2id
    const passwordHash = await hashPassword(password);

    // Atomic Registration Transaction
    return await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          roleName: role,
          phone,
          status: 'ACTIVE',
          emailVerifiedAt: null,
          securityProfile: {
            create: {
              twoFactorEnabled: false,
            },
          },
          wallet: {
            create: {
              balance: 0,
              currency: 'USD',
            },
          },
        },
        include: {
          wallet: true,
        },
      });

      let distributorProfileData: any = null;
      let customerData: any = null;

      if (role === 'DISTRIBUTOR') {
        const uniqueSuffix = Math.floor(10000 + Math.random() * 90000);
        const distributorCode = `DST-${uniqueSuffix}`;

        // Create Distributor Profile
        const profile = await tx.distributorProfile.create({
          data: {
            userId: user.id,
            distributorCode,
            firstName,
            lastName,
            displayName: `${firstName} ${lastName}`,
            status: 'ACTIVE',
            sponsorId,
            activatedAt: new Date(),
          },
        });

        // Create Default Primary Business Center (BC1)
        await tx.businessCenter.create({
          data: {
            distributorId: profile.id,
            centerNumber: 1,
            centerCode: `${distributorCode}-BC1`,
            status: 'ACTIVE',
          },
        });

        // Record Sponsorship Lineage if sponsored
        if (sponsorId) {
          await tx.sponsorRelationship.create({
            data: {
              ancestorId: sponsorId,
              descendantId: profile.id,
              depth: 1,
              isDirect: true,
            },
          });

          // Propagate indirect sponsors
          const ancestors = await tx.sponsorRelationship.findMany({
            where: { descendantId: sponsorId },
          });

          for (const anc of ancestors) {
            await tx.sponsorRelationship.create({
              data: {
                ancestorId: anc.ancestorId,
                descendantId: profile.id,
                depth: anc.depth + 1,
                isDirect: false,
              },
            });
          }
        }

        distributorProfileData = profile;
      } else {
        const uniqueSuffix = Math.floor(10000 + Math.random() * 90000);
        const customerCode = `CUST-${uniqueSuffix}`;

        const customer = await tx.customer.create({
          data: {
            userId: user.id,
            customerCode,
            sponsorId,
            isPreferred: false,
          },
        });

        customerData = customer;
      }

      // Generate Tokens & Session
      const tokens = await this.createSession(
        user.id,
        user.email,
        user.roleName,
        user.status,
        metadata,
        tx
      );

      logger.info({ userId: user.id, email: user.email, role }, 'New user successfully registered');

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.roleName,
          status: user.status,
          firstName,
          lastName,
          ...(distributorProfileData && {
            distributorProfileId: distributorProfileData.id,
            distributorCode: distributorProfileData.distributorCode,
          }),
          ...(customerData && {
            customerId: customerData.id,
            customerCode: customerData.customerCode,
          }),
        },
        tokens,
      };
    });
  }

  /**
   * Authenticates user with Argon2id and issues access token + rotated refresh token session.
   */
  public static async login(input: LoginInput, metadata: RequestMetadata = {}) {
    const { email, password } = input;

    // Fetch user with security profile and domain profiles
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        distributorProfile: true,
        customer: true,
        securityProfile: true,
      },
    });

    if (!user) {
      throw AppError.invalidCredentials('Invalid email or password.');
    }

    // Check account status
    if (user.status === 'BLOCKED') {
      throw AppError.accountInactive(
        'Your account has been blocked. Please contact support.',
        'AUTH_ACCOUNT_BLOCKED'
      );
    }
    if (user.status === 'SUSPENDED') {
      throw AppError.accountInactive(
        'Your account is currently suspended. Please contact support.',
        'AUTH_ACCOUNT_SUSPENDED'
      );
    }
    if (user.status === 'INACTIVE') {
      throw AppError.accountInactive(
        'Your account is inactive. Please contact support.',
        'AUTH_ACCOUNT_INACTIVE'
      );
    }

    // Check temporary lockout if enabled
    if (user.securityProfile?.lockoutUntil && user.securityProfile.lockoutUntil > new Date()) {
      throw AppError.forbidden(
        'Account is temporarily locked due to multiple failed attempts. Please try again later.',
        'AUTH_ACCOUNT_LOCKED'
      );
    }

    // Verify password with Argon2id
    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      // Increment failed attempts
      await prisma.securityProfile.upsert({
        where: { userId: user.id },
        update: {
          failedLoginAttempts: { increment: 1 },
        },
        create: {
          userId: user.id,
          failedLoginAttempts: 1,
        },
      });

      throw AppError.invalidCredentials('Invalid email or password.');
    }

    // Reset failed attempts and update last login
    await prisma.securityProfile.upsert({
      where: { userId: user.id },
      update: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
        lastLoginIp: metadata.ipAddress,
        lockoutUntil: null,
      },
      create: {
        userId: user.id,
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
        lastLoginIp: metadata.ipAddress,
      },
    });

    // Create session and issue tokens
    const tokens = await this.createSession(
      user.id,
      user.email,
      user.roleName,
      user.status,
      metadata
    );

    logger.info({ userId: user.id, email: user.email }, 'User logged in successfully');

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.roleName,
        status: user.status,
        firstName: user.distributorProfile?.firstName || '',
        lastName: user.distributorProfile?.lastName || '',
        displayName: user.distributorProfile?.displayName || user.email,
        ...(user.distributorProfile && {
          distributorProfileId: user.distributorProfile.id,
          distributorCode: user.distributorProfile.distributorCode,
        }),
        ...(user.customer && {
          customerId: user.customer.id,
          customerCode: user.customer.customerCode,
        }),
      },
      tokens,
    };
  }

  /**
   * Refreshes access token with full Refresh Token Rotation and reuse detection.
   */
  public static async refreshToken(token: string, metadata: RequestMetadata = {}) {
    let payload: JwtRefreshPayload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token.', 'AUTH_INVALID_TOKEN');
    }

    const tokenHash = hashToken(token);

    // Look up session in database
    const session = await prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    // -----------------------------------------------------------
    // REUSE DETECTION (Automatic Token Family Invalidation)
    // -----------------------------------------------------------
    if (!session || session.isRevoked) {
      // If a revoked token is presented, someone is replaying an old token.
      // Immediately invalidate all sessions in this token family!
      logger.warn(
        { userId: payload.sub, family: payload.family },
        'Revoked refresh token reuse detected! Invalidating entire session family.'
      );

      await prisma.session.updateMany({
        where: { family: payload.family },
        data: { isRevoked: true },
      });

      throw AppError.unauthorized(
        'Refresh token has already been used or revoked. Please log in again.',
        'AUTH_TOKEN_REUSED'
      );
    }

    if (session.expiresAt < new Date()) {
      throw AppError.unauthorized(
        'Refresh token has expired. Please log in again.',
        'AUTH_TOKEN_EXPIRED'
      );
    }

    const user = session.user;
    if (user.status !== 'ACTIVE') {
      throw AppError.forbidden('Account is not active.', 'AUTH_ACCOUNT_NOT_ACTIVE');
    }

    // -----------------------------------------------------------
    // ROTATION: Revoke used token and issue new pair in same family
    // -----------------------------------------------------------
    return await prisma.$transaction(async (tx) => {
      // Revoke current session
      await tx.session.update({
        where: { id: session.id },
        data: { isRevoked: true },
      });

      // Issue new session in the same family
      const newSessionId = randomUUID();
      const newRefreshToken = signRefreshToken({
        sub: user.id,
        sessionId: newSessionId,
        family: session.family,
      });

      const newRefreshTokenHash = hashToken(newRefreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await tx.session.create({
        data: {
          id: newSessionId,
          userId: user.id,
          refreshTokenHash: newRefreshTokenHash,
          family: session.family,
          expiresAt,
          userAgent: metadata.userAgent,
          ipAddress: metadata.ipAddress,
        },
      });

      const accessToken = signAccessToken({
        sub: user.id,
        email: user.email,
        role: user.roleName,
        status: user.status,
      });

      return {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: 900, // 15 minutes
        },
      };
    });
  }

  /**
   * Logs out user by revoking the specific refresh token session.
   */
  public static async logout(token?: string, userId?: string) {
    if (token) {
      const tokenHash = hashToken(token);
      await prisma.session.updateMany({
        where: { refreshTokenHash: tokenHash },
        data: { isRevoked: true },
      });
    } else if (userId) {
      await prisma.session.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    }

    return {};
  }

  /**
   * Retrieves profile of current authenticated user.
   */
  public static async getMe(userId: string): Promise<AuthUser & Record<string, any>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        distributorProfile: {
          include: {
            businessCenters: true,
            currentRank: true,
            sponsor: {
              select: {
                distributorCode: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        customer: true,
        wallet: true,
        addresses: true,
      },
    });

    if (!user) {
      throw AppError.notFound('User not found.', 'AUTH_USER_NOT_FOUND');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.roleName,
      status: user.status,
      phone: user.phone || undefined,
      distributorProfile: user.distributorProfile
        ? {
            id: user.distributorProfile.id,
            distributorCode: user.distributorProfile.distributorCode,
            firstName: user.distributorProfile.firstName,
            lastName: user.distributorProfile.lastName,
            displayName: user.distributorProfile.displayName,
            status: user.distributorProfile.status,
            currentRank: user.distributorProfile.currentRank?.name || 'Unranked',
            lifetimePV: Number(user.distributorProfile.lifetimePV),
            lifetimeGV: Number(user.distributorProfile.lifetimeGV),
            sponsor: user.distributorProfile.sponsor,
            businessCenters: user.distributorProfile.businessCenters.map((bc) => ({
              id: bc.id,
              centerCode: bc.centerCode,
              centerNumber: bc.centerNumber,
              leftVolume: Number(bc.leftVolume),
              rightVolume: Number(bc.rightVolume),
            })),
          }
        : undefined,
      customer: user.customer || undefined,
      wallet: user.wallet
        ? {
            balance: Number(user.wallet.balance),
            pendingBalance: Number(user.wallet.pendingBalance),
            currency: user.wallet.currency,
          }
        : undefined,
      addresses: user.addresses,
      createdAt: user.createdAt,
    };
  }

  /**
   * Initiates password reset flow with secure cryptographically random token.
   */
  public static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // To prevent user enumeration attacks, return generic success even if user not found
    if (!user) {
      return {
        message: 'If this email exists in our system, password reset instructions have been sent.',
      };
    }

    // Generate secure random token
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    // Invalidate any existing unused reset tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, isUsed: false },
      data: { isUsed: true },
    });

    // Save token hash to database
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    logger.info({ userId: user.id, email }, 'Password reset token generated');

    return {
      message: 'If this email exists in our system, password reset instructions have been sent.',
      // In development mode, provide token for convenience testing
      ...(process.env.NODE_ENV !== 'production' && { devResetToken: rawToken }),
    };
  }

  /**
   * Resets password using valid reset token and invalidates all active sessions.
   */
  public static async resetPassword(input: ResetPasswordInput) {
    const { token, newPassword } = input;
    const tokenHash = hashToken(token);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken || resetToken.isUsed || resetToken.expiresAt < new Date()) {
      throw AppError.badRequest(
        'Invalid or expired password reset token.',
        'AUTH_INVALID_RESET_TOKEN'
      );
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      // 1. Update password
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: newPasswordHash },
      });

      // 2. Mark reset token as used
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { isUsed: true },
      });

      // 3. Invalidate all active sessions to force re-login
      await tx.session.updateMany({
        where: { userId: resetToken.userId, isRevoked: false },
        data: { isRevoked: true },
      });
    });

    logger.info({ userId: resetToken.userId }, 'Password reset successfully completed');

    return {
      message: 'Password reset successfully. Please log in with your new credentials.',
    };
  }

  /**
   * Helper to create a new session and sign access/refresh token pair.
   */
  private static async createSession(
    userId: string,
    email: string,
    role: any,
    status: any,
    metadata: RequestMetadata,
    txClient: any = prisma
  ) {
    const sessionId = randomUUID();
    const family = randomUUID();

    const accessToken = signAccessToken({
      sub: userId,
      email,
      role,
      status,
    });

    const refreshToken = signRefreshToken({
      sub: userId,
      sessionId,
      family,
    });

    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await txClient.session.create({
      data: {
        id: sessionId,
        userId,
        refreshTokenHash,
        family,
        expiresAt,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }
}
