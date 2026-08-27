import 'dotenv/config';
import { z } from 'zod';

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
  JWT_SECRET: z.string().min(16).default('dev-only-secret-change-me-in-production'),
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

export const env = Object.freeze(parsed.data);
export type Env = typeof env;
