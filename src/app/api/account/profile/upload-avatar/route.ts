// app/api/account/profile/upload-avatar/route.ts
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { processImageFile } from "@/lib/heicConverter";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an image." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_AVATAR_SIZE) {
      return NextResponse.json(
        {
          error: "File too large",
          maxSize: MAX_AVATAR_SIZE,
          actualSize: file.size,
          message: `Avatar image must be smaller than ${Math.round(MAX_AVATAR_SIZE / 1024 / 1024)}MB`,
        },
        { status: 413 }
      );
    }

    // Convert HEIC to JPEG if needed
    const processedFile = await processImageFile(file, 0.92);

    // Sanitize filename
    const originalName = processedFile.name || "avatar";
    const sanitized = originalName.replace(/[^\w\d.-]/g, "_").slice(0, 200);
    const timestamp = Date.now();

    // Create storage key - store in user-avatars folder to separate from other uploads
    const key = `user-avatars/${session.user.id}/${timestamp}-${sanitized}`;

    // Upload to blob storage
    const { url } = await put(key, processedFile, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });

    // Update user's image field in database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: url },
    });

    console.log(
      `[avatar-upload] Uploaded avatar for user ${session.user.id}: ${url}`
    );

    return NextResponse.json({
      ok: true,
      url,
      key,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
