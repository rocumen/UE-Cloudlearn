import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env first if present, then workspace root .env (without overwriting existing env vars).
const envCandidates = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env')
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isTest = nodeEnv === 'test';

const parsePort = (rawValue, fallback) => {
  if (rawValue === undefined || rawValue === '') return fallback;
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export function validateEnv(currentEnv = env) {
  if (currentEnv.nodeEnv === 'test') {
    return;
  }

  const missing = [];
  if (!currentEnv.jwtSecret || currentEnv.jwtSecret.length < 16) {
    missing.push('JWT_SECRET (must be at least 16 characters)');
  }
  if (!currentEnv.db.host) missing.push('DB_HOST');
  if (!currentEnv.db.user) missing.push('DB_USER');
  if (!currentEnv.db.password) missing.push('DB_PASSWORD');
  if (!currentEnv.db.name) missing.push('DB_NAME');
  if (
    currentEnv.aws.storageMode === 's3' &&
    !currentEnv.aws.s3BucketName
  ) {
    missing.push('S3_BUCKET_NAME');
  }

  if (missing.length > 0) {
    throw new Error(
      `Invalid backend environment configuration. Missing or invalid: ${missing.join(', ')}`
    );
  }
}

export const env = {
  nodeEnv,
  isTest,
  port: parsePort(process.env.PORT, 5000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  jwtSecret:
    process.env.JWT_SECRET ||
    (isTest ? 'vitest-ephemeral-signing-key-32chars' : ''),
  db: {
    host: process.env.DB_HOST || (isTest ? '127.0.0.1' : ''),
    port: parsePort(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME || 'ue_cloudlearn',
    user: process.env.DB_USER || (isTest ? 'test_user' : ''),
    password: process.env.DB_PASSWORD || ''
  },
  aws: {
    region: process.env.AWS_REGION || 'ap-southeast-1',
    s3BucketName:
      process.env.S3_BUCKET_NAME ||
      (isTest ? 'ue-cloudlearn-test-bucket' : ''),
    storageMode: process.env.STORAGE_MODE || 's3'
  }
};

validateEnv(env);
