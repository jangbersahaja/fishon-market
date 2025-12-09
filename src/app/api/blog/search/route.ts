import { prisma } from "@/lib/database/prisma";
import { connection, NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  await connection();
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category");
    const tag = searchParams.get("tag");

    const where: any = { published: true };

    // Text search
    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { excerpt: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ];
    }

    // Category filter
    if (category) {
      where.categories = {
        some: { slug: category },
      };
    }

    // Tag filter
    if (tag) {
      where.tags = {
        some: { slug: tag },
      };
    }

    const posts = await prisma.blogPost.findMany({
      where,
      include: {
        author: { select: { email: true } },
        categories: true,
        tags: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ posts, total: posts.length });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
