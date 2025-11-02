// app/api/account/reviews/upload-media/route.ts
import { auth } from "@/lib/auth/auth";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const mediaType = form.get("mediaType"); // 'photo' or 'video'

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!mediaType || !["photo", "video"].includes(mediaType.toString())) {
      return NextResponse.json({ error: "Invalid mediaType" }, { status: 400 });
    }

    // Validate file size
    const isVideo = mediaType === "video";
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_PHOTO_SIZE;

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: "File too large",
          maxSize,
          actualSize: file.size,
          message: `${isVideo ? "Video" : "Photo"} exceeds ${Math.round(
            maxSize / 1024 / 1024
          )}MB limit`,
        },
        { status: 413 }
      );
    }

    // Validate file type
    if (isVideo && !file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "Invalid file type. Expected video file." },
        { status: 400 }
      );
    }

    if (!isVideo && !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid file type. Expected image file." },
        { status: 400 }
      );
    }

    // Sanitize filename
    const originalName = file.name || "file";
    const sanitized = originalName.replace(/[^\w\d.-]/g, "_").slice(0, 200);
    const timestamp = Date.now();

    // Create storage key
    const mediaFolder = isVideo ? "review-videos" : "review-photos";
    const key = `${mediaFolder}/${session.user.id}/${timestamp}-${sanitized}`;

    // Upload to blob storage
    const { url } = await put(key, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });

    console.log(
      `[review-media-upload] Uploaded ${mediaType} for user ${session.user.id}: ${url}`
    );

    return NextResponse.json({
      ok: true,
      url,
      key,
      mediaType,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error("Review media upload error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
