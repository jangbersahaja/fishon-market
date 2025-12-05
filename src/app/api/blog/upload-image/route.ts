import { authOptions } from "@/lib/auth/auth-options";
import { processImageFile } from "@/lib/heicConverter";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const maxDuration = 30;

// Maximum file size: 5MB for blog images
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Allowed image types
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;
  const id = (user as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Parse form data
    const form = await req.formData();
    const file = form.get("file");
    const typeRaw = form.get("type"); // 'cover' | 'content'

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
    const originalName = processedFile.name || "image";
    const sanitized = originalName.replace(/[^\w\d.-]/g, "_").slice(0, 100);
    const timestamp = Date.now();
    const type =
      typeRaw === "cover" || typeRaw === "content" ? typeRaw : "content";

    // Construct blob key with organized structure:
    // blog/{userId}/{type}/{timestamp}-{filename}
    const key = `blog/${userId}/${type}/${timestamp}-${sanitized}`;

    // Upload to Vercel Blob
    const { url } = await put(key, processedFile, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });

    console.log(`[blog-upload] Uploaded ${type} image: ${key}`);

    return NextResponse.json({
      success: true,
      url,
      key,
      type,
    });
  } catch (error) {
    console.error("[blog-upload] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
