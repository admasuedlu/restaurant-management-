/**
 * Application config — import load-env first so process.env is populated before reads.
 */
import "./load-env.js";

const isProd = process.env.NODE_ENV === "production";

function env(name: string, devDefault?: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (!isProd && devDefault !== undefined) return devDefault;
  throw new Error(
    `Missing required environment variable: ${name}. Copy .env.example to .env and set it.`
  );
}

function optional(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

export const config = {
  isProd,
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",

  databaseUrl: env(
    "DATABASE_URL",
    "postgresql://postgres:1234@localhost:5432/habesha_os"
  ),

  /** Legacy admin API key — required in production; dev-only fallback */
  adminKey: env("ADMIN_KEY", "dev-admin-key-change-me"),

  superAdminEmail: env("SUPER_ADMIN_EMAIL", "admin@localhost"),
  superAdminPassword: env("SUPER_ADMIN_PASSWORD", "dev-admin-password-change-me"),

  geminiApiKey: optional("GEMINI_API_KEY"),
  appUrl: optional("APP_URL", "http://localhost:3000"),

  emailUser: optional("EMAIL_USER"),
  emailPass: optional("EMAIL_PASS").replace(/\s/g, ""),

  chapaSecretKey: optional("CHAPA_SECRET_KEY"),
  chapaEncryptionKey: optional("CHAPA_ENCRYPTION_KEY"),

  smsApiUrl: optional("SMS_API_URL"),
  smsApiKey: optional("SMS_API_KEY"),

  jwtSecret: env("JWT_SECRET", "dev-jwt-secret-change-me-in-production"),
};

/** Warn when dev defaults are in use (never in production). */
export function logConfigWarnings(): void {
  if (isProd) return;
  const warnings: string[] = [];
  if (!process.env.DATABASE_URL) warnings.push("DATABASE_URL (using local default)");
  if (!process.env.ADMIN_KEY) warnings.push("ADMIN_KEY (using dev default)");
  if (!process.env.SUPER_ADMIN_EMAIL) warnings.push("SUPER_ADMIN_EMAIL (using dev default)");
  if (!process.env.SUPER_ADMIN_PASSWORD) warnings.push("SUPER_ADMIN_PASSWORD (using dev default)");
  if (!config.geminiApiKey) warnings.push("GEMINI_API_KEY (AI will use fallback)");
  if (!process.env.JWT_SECRET) warnings.push("JWT_SECRET (using insecure dev default)");
  if (warnings.length) {
    console.warn("⚠️  Dev mode — unset env vars:", warnings.join(", "));
  }
}
