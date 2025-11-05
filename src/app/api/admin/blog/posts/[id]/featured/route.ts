import { prisma } from "@/lib/database/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { featured } = await request.json();

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        featured,
        featuredAt: featured ? new Date() : null,
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error updating featured status:", error);
    return NextResponse.json(
      { error: "Failed to update featured status" },
      { status: 500 }
    );
  }
}
