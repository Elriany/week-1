import 'dotenv/config';
import { z } from 'zod';

/**
 * Convenience for local development only. Production must set JWT_SECRET
 * explicitly — a signing key committed to the repository is not a secret.
 */
export const DEV_JWT_SECRET = 'dev-only-secret-change-me-in-production';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  // Database — SQL Server (Windows Authentication)
  DB_SERVER: z.string().min(1).default('.'),
  DB_DATABASE: z.string().min(1).default('CRM'),
  DB_TRUSTED_CONNECTION: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  DB_TRUST_SERVER_CERTIFICATE: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  DB_ENCRYPT: z.enum(['true', 'false']).transform(v => v === 'true').default('false'),
  DB_ODBC_DRIVER: z.string().default('ODBC Driver 18 for SQL Server'),
  // Authentication — JWT
  JWT_SECRET: z.string().min(16).default(DEV_JWT_SECRET),
  JWT_ACCESS_EXPIRY: z.string().default('1h'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  // File uploads — customer attachments
  UPLOAD_DIR: z.string().min(1).default('./uploads'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Print every offending variable, then exit non-zero. Never start on a partial config.
  console.error('Invalid environment configuration:', JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

// Every other setting with a default is genuinely safe to default; a signing
// key is not. Fail closed rather than boot production with a known secret.
if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_SECRET === DEV_JWT_SECRET) {
  console.error('JWT_SECRET must be set explicitly in production.');
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
export type Env = typeof env;
