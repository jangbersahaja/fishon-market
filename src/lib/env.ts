// Centralized runtime environment loader & validator.
// Evaluated on first import; throws early for invalid/missing server config.
// Public variables (NEXT_PUBLIC_*) are re-exported in a typed shape.

const REQUIRED_SERVER = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
];

// (Optional server variables are documented; no current mandatory usage list needed.)

const PUBLIC_PREFIX = "NEXT_PUBLIC_";

interface PublicEnvShape {
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?: string;
  NEXT_PUBLIC_BASE_URL?: string;
  NEXT_PUBLIC_CAPTAIN_URL?: string;
}

interface ServerEnvShape extends PublicEnvShape {
  DATABASE_URL: string;
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL?: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  // Database connections
  CAPTAIN_DATABASE_URL?: string;
  USE_CAPTAIN_DB?: string;
  // Blob storage
  BLOB_READ_WRITE_TOKEN?: string;
  BLOB_HOSTNAME?: string;
  // QStash
  QSTASH_URL?: string;
  QSTASH_TOKEN?: string;
  QSTASH_CURRENT_SIGNING_KEY?: string;
  QSTASH_NEXT_SIGNING_KEY?: string;
  STRICT_QSTASH_SIGNATURE?: string;
  // Email (SMTP)
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  SMTP_SECURE?: string;
  // Pusher
  PUSHER_APP_ID?: string;
  PUSHER_KEY?: string;
  PUSHER_SECRET?: string;
  PUSHER_CLUSTER?: string;
  NEXT_PUBLIC_PUSHER_KEY?: string;
  NEXT_PUBLIC_PUSHER_CLUSTER?: string;
  // Booking system
  BOOKINGS_EXPIRE_SECRET?: string;
  CRON_SECRET?: string;
  // Fishon Captain Integration
  FISHON_CAPTAIN_API_URL?: string;
  FISHON_CAPTAIN_API_KEY?: string;
  CAPTAIN_API_SECRET?: string;
  CAPTAIN_WEBHOOK_URL?: string;
  // Senang Pay payment gateway
  SENANGPAY_MERCHANT_ID?: string;
  SENANGPAY_SECRET_KEY?: string;
  SENANGPAY_MODE?: string;
  SENANGPAY_FORCE_MOCK?: string;
  NODE_ENV: string;
}

function assertPresent(
  key: string,
  value: string | undefined | null,
  errors: string[]
) {
  if (!value || !String(value).trim()) errors.push(`${key} is required`);
}

function looksLikeUrl(val: string | undefined): boolean {
  if (!val) return false;
  try {
    new URL(val);
    return true;
  } catch {
    return false;
  }
}

function entropyCheck(secret: string): boolean {
  // Very light heuristic: length >= 32 and not composed solely of base words.
  if (!secret || secret.length < 32) return false;
  const simplePatterns = /(password|secret|changeme|example|test)/i;
  return !simplePatterns.test(secret);
}

export function loadEnv(): ServerEnvShape {
  const errors: string[] = [];
  const w: NodeJS.ProcessEnv = process.env;

  // Skip validation during build time (Next.js data collection phase)
  // Environment variables will be validated at runtime when the app actually runs
  // Use Next.js specific build phase indicator to avoid false positives
  const isBuildTime =
    process.env.NEXT_PHASE === "phase-production-build" ||
    (process.env.NEXT_PHASE === "phase-production-server" && !w.DATABASE_URL);

  if (isBuildTime) {
    console.log("[env] Build-time detected, skipping environment validation");
    // Return a partial shape with empty values for build-time only
    return {
      DATABASE_URL: w.DATABASE_URL || "",
      NEXTAUTH_SECRET: w.NEXTAUTH_SECRET || "",
      NEXTAUTH_URL: w.NEXTAUTH_URL,
      GOOGLE_CLIENT_ID: w.GOOGLE_CLIENT_ID || "",
      GOOGLE_CLIENT_SECRET: w.GOOGLE_CLIENT_SECRET || "",
      CAPTAIN_DATABASE_URL: w.CAPTAIN_DATABASE_URL,
      USE_CAPTAIN_DB: w.USE_CAPTAIN_DB,
      BLOB_READ_WRITE_TOKEN: w.BLOB_READ_WRITE_TOKEN,
      BLOB_HOSTNAME: w.BLOB_HOSTNAME,
      QSTASH_URL: w.QSTASH_URL,
      QSTASH_TOKEN: w.QSTASH_TOKEN,
      QSTASH_CURRENT_SIGNING_KEY: w.QSTASH_CURRENT_SIGNING_KEY,
      QSTASH_NEXT_SIGNING_KEY: w.QSTASH_NEXT_SIGNING_KEY,
      STRICT_QSTASH_SIGNATURE: w.STRICT_QSTASH_SIGNATURE,
      SMTP_HOST: w.SMTP_HOST,
      SMTP_PORT: w.SMTP_PORT,
      SMTP_USER: w.SMTP_USER,
      SMTP_PASSWORD: w.SMTP_PASSWORD,
      SMTP_SECURE: w.SMTP_SECURE,
      PUSHER_APP_ID: w.PUSHER_APP_ID,
      PUSHER_KEY: w.PUSHER_KEY,
      PUSHER_SECRET: w.PUSHER_SECRET,
      PUSHER_CLUSTER: w.PUSHER_CLUSTER,
      BOOKINGS_EXPIRE_SECRET: w.BOOKINGS_EXPIRE_SECRET,
      CRON_SECRET: w.CRON_SECRET,
      FISHON_CAPTAIN_API_URL: w.FISHON_CAPTAIN_API_URL,
      FISHON_CAPTAIN_API_KEY: w.FISHON_CAPTAIN_API_KEY,
      CAPTAIN_API_SECRET: w.CAPTAIN_API_SECRET,
      CAPTAIN_WEBHOOK_URL: w.CAPTAIN_WEBHOOK_URL,
      SENANGPAY_MERCHANT_ID: w.SENANGPAY_MERCHANT_ID,
      SENANGPAY_SECRET_KEY: w.SENANGPAY_SECRET_KEY,
      SENANGPAY_MODE: w.SENANGPAY_MODE,
      SENANGPAY_FORCE_MOCK: w.SENANGPAY_FORCE_MOCK,
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: w.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      NEXT_PUBLIC_BASE_URL: w.NEXT_PUBLIC_BASE_URL,
      NEXT_PUBLIC_CAPTAIN_URL: w.NEXT_PUBLIC_CAPTAIN_URL,
      NEXT_PUBLIC_PUSHER_KEY: w.NEXT_PUBLIC_PUSHER_KEY,
      NEXT_PUBLIC_PUSHER_CLUSTER: w.NEXT_PUBLIC_PUSHER_CLUSTER,
      NODE_ENV: w.NODE_ENV || "production",
    };
  }

  // Required server vars
  for (const k of REQUIRED_SERVER) assertPresent(k, w[k], errors);

  // Public vars (do not enforce required unless design needs them)
  const publicVars: PublicEnvShape = {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: w.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_BASE_URL: w.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_CAPTAIN_URL: w.NEXT_PUBLIC_CAPTAIN_URL,
  };

  // Shape validations
  if (w.DATABASE_URL && !w.DATABASE_URL.startsWith("postgres")) {
    errors.push("DATABASE_URL should start with postgres:// or postgresql://");
  }
  if (
    w.CAPTAIN_DATABASE_URL &&
    !w.CAPTAIN_DATABASE_URL.startsWith("postgres")
  ) {
    errors.push(
      "CAPTAIN_DATABASE_URL should start with postgres:// or postgresql://"
    );
  }
  if (w.NEXTAUTH_SECRET && !entropyCheck(w.NEXTAUTH_SECRET)) {
    errors.push("NEXTAUTH_SECRET appears weak (length < 32 or low entropy)");
  }
  if (w.FISHON_CAPTAIN_API_URL && !looksLikeUrl(w.FISHON_CAPTAIN_API_URL)) {
    errors.push("FISHON_CAPTAIN_API_URL is not a valid URL");
  }
  if (w.CAPTAIN_WEBHOOK_URL && !looksLikeUrl(w.CAPTAIN_WEBHOOK_URL)) {
    errors.push("CAPTAIN_WEBHOOK_URL is not a valid URL");
  }
  if (w.QSTASH_URL && !looksLikeUrl(w.QSTASH_URL)) {
    errors.push("QSTASH_URL is not a valid URL");
  }

  // Warn if Google Maps API key missing
  if (!w.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    console.warn(
      "[env] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY missing; Maps features will not work."
    );
  }

  // Warn if Fishon Captain integration variables are missing
  if (!w.FISHON_CAPTAIN_API_URL) {
    console.warn(
      "[env] FISHON_CAPTAIN_API_URL missing; server-side API calls to captain will use fallback or fail."
    );
  }
  if (!w.NEXT_PUBLIC_CAPTAIN_URL) {
    console.warn(
      "[env] NEXT_PUBLIC_CAPTAIN_URL missing; client-side availability checks will use fallback or fail."
    );
  }
  if (!w.CAPTAIN_API_SECRET) {
    console.warn(
      "[env] CAPTAIN_API_SECRET missing; webhook authentication to captain will fail."
    );
  }
  if (!w.FISHON_CAPTAIN_API_KEY) {
    console.warn(
      "[env] FISHON_CAPTAIN_API_KEY missing; public API authentication will fail."
    );
  }
  if (!w.CAPTAIN_WEBHOOK_URL) {
    console.warn(
      "[env] CAPTAIN_WEBHOOK_URL missing; notifications to captain will fail."
    );
  }

  // Validate shared secret entropy if present
  if (w.CAPTAIN_API_SECRET && !entropyCheck(w.CAPTAIN_API_SECRET)) {
    console.warn(
      "[env] CAPTAIN_API_SECRET appears weak (length < 32 or low entropy); recommend generating with: openssl rand -base64 48"
    );
  }

  // Warn if Senang Pay payment gateway is not configured (optional)
  if (!w.SENANGPAY_MERCHANT_ID || !w.SENANGPAY_SECRET_KEY) {
    console.warn(
      "[env] Senang Pay not configured (SENANGPAY_MERCHANT_ID or SENANGPAY_SECRET_KEY missing); payment gateway will use mock payment fallback."
    );
  } else {
    // Validate Senang Pay secret key entropy if present
    if (w.SENANGPAY_SECRET_KEY && !entropyCheck(w.SENANGPAY_SECRET_KEY)) {
      console.warn(
        "[env] SENANGPAY_SECRET_KEY appears weak (length < 32 or low entropy); this may indicate a test/placeholder value."
      );
    }
    // Validate mode is either sandbox or production
    if (
      w.SENANGPAY_MODE &&
      !["sandbox", "production"].includes(w.SENANGPAY_MODE)
    ) {
      console.warn(
        `[env] SENANGPAY_MODE should be 'sandbox' or 'production', got: ${w.SENANGPAY_MODE}`
      );
    }
  }

  // Secret leakage guard: disallow server secrets accidentally prefixed with NEXT_PUBLIC_
  for (const key of Object.keys(w)) {
    if (key.startsWith(PUBLIC_PREFIX) && REQUIRED_SERVER.includes(key)) {
      errors.push(
        `Sensitive key ${key} should not be exposed with NEXT_PUBLIC_ prefix.`
      );
    }
  }

  if (errors.length) {
    throw new Error(
      "Environment validation failed:\n" +
        errors.map((e) => " - " + e).join("\n")
    );
  }

  return {
    DATABASE_URL: w.DATABASE_URL!,
    NEXTAUTH_SECRET: w.NEXTAUTH_SECRET!,
    NEXTAUTH_URL: w.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: w.GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: w.GOOGLE_CLIENT_SECRET!,
    CAPTAIN_DATABASE_URL: w.CAPTAIN_DATABASE_URL,
    USE_CAPTAIN_DB: w.USE_CAPTAIN_DB,
    BLOB_READ_WRITE_TOKEN: w.BLOB_READ_WRITE_TOKEN,
    BLOB_HOSTNAME: w.BLOB_HOSTNAME,
    QSTASH_URL: w.QSTASH_URL,
    QSTASH_TOKEN: w.QSTASH_TOKEN,
    QSTASH_CURRENT_SIGNING_KEY: w.QSTASH_CURRENT_SIGNING_KEY,
    QSTASH_NEXT_SIGNING_KEY: w.QSTASH_NEXT_SIGNING_KEY,
    STRICT_QSTASH_SIGNATURE: w.STRICT_QSTASH_SIGNATURE,
    SMTP_HOST: w.SMTP_HOST,
    SMTP_PORT: w.SMTP_PORT,
    SMTP_USER: w.SMTP_USER,
    SMTP_PASSWORD: w.SMTP_PASSWORD,
    SMTP_SECURE: w.SMTP_SECURE,
    PUSHER_APP_ID: w.PUSHER_APP_ID,
    PUSHER_KEY: w.PUSHER_KEY,
    PUSHER_SECRET: w.PUSHER_SECRET,
    PUSHER_CLUSTER: w.PUSHER_CLUSTER,
    BOOKINGS_EXPIRE_SECRET: w.BOOKINGS_EXPIRE_SECRET,
    CRON_SECRET: w.CRON_SECRET,
    FISHON_CAPTAIN_API_URL: w.FISHON_CAPTAIN_API_URL,
    FISHON_CAPTAIN_API_KEY: w.FISHON_CAPTAIN_API_KEY,
    CAPTAIN_API_SECRET: w.CAPTAIN_API_SECRET,
    CAPTAIN_WEBHOOK_URL: w.CAPTAIN_WEBHOOK_URL,
    SENANGPAY_MERCHANT_ID: w.SENANGPAY_MERCHANT_ID,
    SENANGPAY_SECRET_KEY: w.SENANGPAY_SECRET_KEY,
    SENANGPAY_MODE: w.SENANGPAY_MODE,
    SENANGPAY_FORCE_MOCK: w.SENANGPAY_FORCE_MOCK,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: publicVars.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_BASE_URL: publicVars.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_CAPTAIN_URL: publicVars.NEXT_PUBLIC_CAPTAIN_URL,
    NEXT_PUBLIC_PUSHER_KEY: w.NEXT_PUBLIC_PUSHER_KEY,
    NEXT_PUBLIC_PUSHER_CLUSTER: w.NEXT_PUBLIC_PUSHER_CLUSTER,
    NODE_ENV: w.NODE_ENV || "development",
  };
}

// Singleton pattern to avoid repeated validation overhead.
let cached: ServerEnvShape | null = null;
export function getEnv(): ServerEnvShape {
  if (!cached) cached = loadEnv();
  return cached;
}

// Test-only helper to force re-validation with mutated process.env. Not for runtime use.
export function __resetEnvCacheForTests() {
  cached = null;
}

// Convenience export for server code: lazy proxy so tests can mutate process.env before first access.
export const env: ServerEnvShape = new Proxy(
  {},
  {
    get(_t, p) {
      return (getEnv() as unknown as Record<string, unknown>)[p as string];
    },
    ownKeys() {
      return Reflect.ownKeys(getEnv() as unknown as Record<string, unknown>);
    },
    getOwnPropertyDescriptor() {
      return { enumerable: true, configurable: true };
    },
  }
) as ServerEnvShape;

// For client components, only import the specific NEXT_PUBLIC_* vars directly
// via process.env (Next.js inlines them). Do not re-export secrets through this module.
