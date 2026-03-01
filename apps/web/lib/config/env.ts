import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_BASE_URL: z.string().url().default('http://127.0.0.1:3000'),
  DATABASE_URL: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  AUTH_TRUST_HOST: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APPLE_ID: z.string().optional(),
  APPLE_SECRET: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  RESEND_API_KEY: z.string().optional(),
  PG_BOSS_DATABASE_URL: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(): AppEnv {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Environment configuration is invalid: ${issues}`);
  }

  return parsed.data;
}

export function assertRuntimeEnv(): void {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const env = getEnv();
  const missing: string[] = [];

  if (!env.APP_BASE_URL) {
    missing.push('APP_BASE_URL');
  }

  if (!env.AUTH_SECRET) {
    missing.push('AUTH_SECRET');
  }

  if (!env.EMAIL_FROM) {
    missing.push('EMAIL_FROM');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables for runtime: ${missing.join(', ')}`);
  }
}
