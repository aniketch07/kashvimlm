import bcrypt from 'bcryptjs';
import { query } from '../../config/db.js';

export interface EnrollApplicantDTO {
  sponsorId: string;
  enrollType: 'distributor' | 'customer';
  fullName: string;
  email: string;
  phone: string;
  dob?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  placementLeg?: 'auto' | 'left' | 'right';
  starterKitId?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  password?: string;
}

export class EnrollmentService {
  static async verifySponsor(sponsorId: string) {
    const res = await query(
      `SELECT d.id, d.member_id, d.full_name, d.rank, d.qualification_status, d.city, d.state
       FROM distributors d
       WHERE d.member_id = $1`,
      [sponsorId.trim()]
    );

    if (res.rows.length === 0) {
      return {
        isValid: false,
        message: `Sponsor ID ${sponsorId} was not found in the verified partner directory.`,
      };
    }

    return {
      isValid: true,
      sponsor: res.rows[0],
    };
  }

  static async enrollApplicant(dto: EnrollApplicantDTO) {
    // 1. Verify sponsor
    const sponsorCheck = await this.verifySponsor(dto.sponsorId);
    if (!sponsorCheck.isValid || !sponsorCheck.sponsor) {
      throw new Error(`Invalid sponsor ID: ${dto.sponsorId}`);
    }

    // 2. Generate new unique Member ID (e.g. 18600000 to 18699999)
    const newMemberId = `186${Math.floor(10000 + Math.random() * 90000)}`;
    const username = `@${dto.email.split('@')[0]}_${Math.floor(100 + Math.random() * 900)}`;
    const initialPassword = dto.password || 'WelcomeKashvi2026!';

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(initialPassword, salt);

    // 3. Kit volume calculation
    const kitBV =
      dto.starterKitId === 'kit_pro'
        ? 100
        : dto.starterKitId === 'kit_elite'
        ? 200
        : 50;

    // 4. Create User
    const userRes = await query(
      `INSERT INTO users (email, phone, username, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, phone, username, role`,
      [
        dto.email.toLowerCase().trim(),
        dto.phone.trim(),
        username,
        passwordHash,
        dto.enrollType === 'customer' ? 'customer' : 'distributor',
      ]
    );

    const newUser = userRes.rows[0];

    // 5. Create Distributor Record
    const distRes = await query(
      `INSERT INTO distributors (
        user_id, member_id, full_name, sponsor_id, placement_leg,
        current_psv, lifetime_bv, bank_name, bank_account_number, bank_ifsc_code,
        address, city, state, pincode
       ) VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, member_id, full_name, sponsor_id, placement_leg, rank`,
      [
        newUser.id,
        newMemberId,
        dto.fullName.trim(),
        dto.sponsorId.trim(),
        dto.placementLeg || 'auto',
        kitBV,
        dto.bankName,
        dto.accountNumber,
        dto.ifscCode,
        dto.address,
        dto.city,
        dto.state,
        dto.pincode,
      ]
    );

    const newDist = distRes.rows[0];

    // 6. Initialize Wallet
    await query(
      `INSERT INTO wallets (distributor_id, available_balance, pending_balance)
       VALUES ($1, 0.00, 0.00)`,
      [newDist.id]
    );

    // 7. Place into Binary MLM Tree
    await query(
      `INSERT INTO mlm_tree (distributor_id, business_center_code, tree_path)
       VALUES ($1, 'BC 001', $2)`,
      [newDist.id, `/${dto.sponsorId}/${newMemberId}`]
    );

    // 8. Update sponsor team count
    await query(
      `UPDATE distributors SET team_size = team_size + 1 WHERE member_id = $1`,
      [dto.sponsorId.trim()]
    );

    return {
      memberId: newMemberId,
      name: newDist.full_name,
      email: newUser.email,
      sponsorId: dto.sponsorId,
      sponsorName: sponsorCheck.sponsor.full_name,
      placement:
        dto.placementLeg === 'left'
          ? 'Left Leg (BC 002)'
          : dto.placementLeg === 'right'
          ? 'Right Leg (BC 003)'
          : 'Auto-Balanced (BC 001)',
      assignedBV: kitBV,
      status: 'Active & Verified',
      credentials: {
        username: newUser.username,
        initialPassword,
      },
    };
  }
}
