/**
 * Validates all required environment variables at startup.
 * Import this at the top of any entry point that needs env vars.
 * Throws immediately with a clear message so deployment failures
 * are caught before the first request is served.
 */

const required = [
  "DATABASE_URL",
  "JWT_SECRET",
  "R2_ENDPOINT",
  "R2_REGION",
  "R2_BUCKET_NAME",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PUBLIC_URL",
  "PUSHER_APP_ID",
  "PUSHER_KEY",
  "PUSHER_SECRET",
  "PUSHER_CLUSTER",
  "NEXT_PUBLIC_PUSHER_KEY",
  "NEXT_PUBLIC_PUSHER_CLUSTER",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "ADMIN_EMAIL",
  "MAIL_FROM_NAME",
  "MAIL_FROM_ADDRESS",
  "NEXT_PUBLIC_APP_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

type RequiredEnvKey = (typeof required)[number];

/**
 * Validated, typed environment variables.
 * Use this instead of process.env throughout the codebase
 * so you get autocomplete and guaranteed non-null values.
 */
export const env = {} as Record<RequiredEnvKey, string>;

function validateEnv(): void {
  const missing: string[] = [];

  for (const key of required) {
    const value = process.env[key];
    if (!value || value.trim() === "") {
      missing.push(key);
    } else {
      env[key] = value;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join("\n")}\n` +
        `Check your .env file or Vercel environment settings.`
    );
  }

  // Extra sanity checks beyond presence
  if (env.JWT_SECRET.length < 32) {
    throw new Error(
      "[env] JWT_SECRET must be at least 32 characters. Generate one with: openssl rand -hex 64"
    );
  }
}

// Run immediately on import — fails fast, fails loud
validateEnv();
