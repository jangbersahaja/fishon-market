import { auth } from "@/lib/auth/auth";
import { processImageFile } from "@/lib/heicConverter";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

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

export async function POST(req: Request) {
  try {
    // Check authentication and admin role
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session?.user?.id || !["ADMIN", "STAFF"].includes(userRole)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse form data
    const form = await req.formData();
    const file = form.get("file");
    const campaignCode = form.get("campaignCode"); // Optional: to organize by campaign

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

    // Construct blob key with organized structure:
    // campaigns/{userId}/{campaignCode}/{timestamp}-{filename}
    // or campaigns/{userId}/{timestamp}-{filename} if no campaign code
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

    console.log(`[campaign-upload] Uploaded campaign image: ${key}`);

    return NextResponse.json({
      success: true,
      url,
      key,
    });
  } catch (error) {
    console.error("[campaign-upload] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
