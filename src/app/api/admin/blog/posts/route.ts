import { prisma } from "@/lib/database/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "12");
    const query = searchParams.get("q") || "";
    const status = searchParams.get("status") || "all";
    const categorySlug = searchParams.get("category") || "";
    const tagSlug = searchParams.get("tag") || "";

    const skip = (page - 1) * perPage;

    // Build where clause
    const where: any = {};

    // Status filter
    if (status === "published") {
      where.published = true;
    } else if (status === "draft") {
      where.published = false;
    }

    // Search query
    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { excerpt: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ];
    }

    // Category filter
    if (categorySlug) {
      where.categories = { some: { slug: categorySlug } };
    }

    // Tag filter
    if (tagSlug) {
      where.tags = { some: { slug: tagSlug } };
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: {
          author: { select: { email: true, name: true } },
          categories: true,
          tags: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      prisma.blogPost.count({ where }),
    ]);

    const totalPages = Math.ceil(total / perPage);

    return NextResponse.json({
      posts,
      total,
      page,
      perPage,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
