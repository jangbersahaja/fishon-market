import { NextResponse } from "next/server";

/**
 * GET /api/dev/check-smtp
 * 
 * Development-only endpoint to check SMTP configuration.
 * Returns status of environment variables (without exposing values).
 */
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 404 }
    );
  }

  const config = {
    SMTP_HOST: !!process.env.SMTP_HOST,
    SMTP_PORT: !!process.env.SMTP_PORT,
    SMTP_USER: !!process.env.SMTP_USER,
    SMTP_PASS: !!process.env.SMTP_PASS,
    SMTP_PASSWORD: !!process.env.SMTP_PASSWORD,
    SMTP_SECURE: !!process.env.SMTP_SECURE,
    hasPassword: !!(process.env.SMTP_PASS || process.env.SMTP_PASSWORD),
  };

  const isFullyConfigured = 
    config.SMTP_HOST && 
    config.SMTP_USER && 
    config.hasPassword;

  return NextResponse.json({
    configured: isFullyConfigured,
    config,
    message: isFullyConfigured 
      ? "SMTP is fully configured" 
      : "SMTP configuration incomplete. Check .env.local",
  });
}
