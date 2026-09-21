import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kashvimlm',
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: parseInt(process.env.DB_PORT || '5432', 10),
  dbUser: process.env.DB_USER || 'postgres',
  dbPassword: process.env.DB_PASSWORD || 'postgres',
  dbName: process.env.DB_NAME || 'kashvimlm',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'kashvimlm_super_secure_jwt_secret_key_2026!',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // MLM Rules
  defaultSponsorId: process.env.DEFAULT_SPONSOR_ID || '88767139',
  minimumQualifyingBv: parseInt(process.env.MINIMUM_QUALIFYING_BV || '100', 10),
  binaryMatchPercentage: parseFloat(process.env.BINARY_MATCH_PERCENTAGE || '10'),
  tdsDeductionPercentage: parseFloat(process.env.TDS_DEDUCTION_PERCENTAGE || '5'),
  adminFeePercentage: parseFloat(process.env.ADMIN_FEE_PERCENTAGE || '5'),
};
