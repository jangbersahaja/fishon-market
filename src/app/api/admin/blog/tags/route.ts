import { prisma } from "@/lib/database/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const tags = await prisma.blogTag.findMany({
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
