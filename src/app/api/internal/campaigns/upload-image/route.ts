import { auth } from "@/lib/auth/auth";
import { processImageFile } from "@/lib/heicConverter";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// Shared secret for internal API calls from fishon-captain
// Uses the same CAPTAIN_API_SECRET as other cross-app integrations
const CAPTAIN_API_SECRET = process.env.CAPTAIN_API_SECRET;

// Maximum file size: 5MB for campaign images
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Allowed image types
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Verify internal API request (either via session or shared secret)
 */
async function verifyInternalRequest(req: Request): Promise<{
  authorized: boolean;
  userId?: string;
  error?: string;
}> {
  // Check for captain API secret header (for server-to-server calls)
  const apiSecret = req.headers.get("x-captain-api-secret");
  if (apiSecret && CAPTAIN_API_SECRET && apiSecret === CAPTAIN_API_SECRET) {
    const userId = req.headers.get("x-user-id");
    return { authorized: true, userId: userId || undefined };
  }

  // Fallback to session-based auth
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session?.user?.id || !["ADMIN", "STAFF"].includes(userRole)) {
    return { authorized: false, error: "Unauthorized. Admin access required." };
  }

  return { authorized: true, userId: session.user.id };
}

/**
 * POST /api/internal/campaigns/upload-image
 * Upload campaign image to Vercel Blob
 */
export async function POST(req: Request) {
  try {
    const verification = await verifyInternalRequest(req);
    if (!verification.authorized) {
      return NextResponse.json({ error: verification.error }, { status: 401 });
    }

    const userId = verification.userId || "anonymous";

    // Parse form data
    const form = await req.formData();
    const file = form.get("file");
    const campaignCode = form.get("campaignCode");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing or invalid file" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed: ${Array.from(ALLOWED_TYPES).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
        },
        { status: 413 }
      );
    }

    // Convert HEIC to JPEG if needed
    const processedFile = await processImageFile(file, 0.92);

    // Sanitize filename
    const originalName = processedFile.name || "campaign-image";
    const sanitized = originalName.replace(/[^\w\d.-]/g, "_").slice(0, 100);
    const timestamp = Date.now();

    // Construct blob key with organized structure
    const basePath = campaignCode
      ? `campaigns/${userId}/${campaignCode}`
      : `campaigns/${userId}`;
    const key = `${basePath}/${timestamp}-${sanitized}`;

    // Upload to Vercel Blob
    const { url } = await put(key, processedFile, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });

    console.log(`[internal/campaigns/upload-image] Uploaded: ${key}`);

    return NextResponse.json({
      success: true,
      url,
      key,
    });
  } catch (error) {
    console.error("[internal/campaigns/upload-image] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
