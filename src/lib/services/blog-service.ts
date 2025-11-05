import { prisma } from "@/lib/database/prisma";
import type { BlogCategory, BlogPost, BlogTag, User } from "@prisma/client";

export type BlogPostWithDetails = BlogPost & {
  author: Pick<User, "id" | "email" | "name" | "image" | "bio">;
  categories: BlogCategory[];
  tags: BlogTag[];
  comments?: BlogCommentWithAuthor[];
};

export type BlogCommentWithAuthor = {
  id: string;
  content: string;
  createdAt: Date;
  author: Pick<User, "email" | "name">;
  approved: boolean;
};

/**
 * Get paginated blog posts (published only) with advanced filters
 */
export async function getBlogPosts({
  page = 1,
  perPage = 12,
  query,
  categorySlug,
  tagSlug,
  dateFrom,
  dateTo,
}: {
  page?: number;
  perPage?: number;
  query?: string;
  categorySlug?: string;
  tagSlug?: string;
  dateFrom?: Date;
  dateTo?: Date;
} = {}) {
  const skip = (page - 1) * perPage;

  // Build where clause with filters
  const where: any = { published: true };

  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { excerpt: { contains: query, mode: "insensitive" } },
      { content: { contains: query, mode: "insensitive" } },
    ];
  }

  if (categorySlug) {
    where.categories = { some: { slug: categorySlug } };
  }

  if (tagSlug) {
    where.tags = { some: { slug: tagSlug } };
  }

  if (dateFrom || dateTo) {
    where.publishedAt = {};
    if (dateFrom) where.publishedAt.gte = dateFrom;
    if (dateTo) where.publishedAt.lte = dateTo;
  }

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            bio: true,
          },
        },
        categories: true,
        tags: true,
      },
      orderBy: { publishedAt: "desc" },
      skip,
      take: perPage,
    }),
    prisma.blogPost.count({ where }),
  ]);

  return { posts, total };
}

/**
 * Get featured blog posts with explicit featured flag
 */
export async function getFeaturedPosts(limit = 3) {
  return prisma.blogPost.findMany({
    where: {
      published: true,
      featured: true, // Only get explicitly featured posts
    },
    include: {
      author: {
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          bio: true,
        },
      },
      categories: true,
      tags: true,
    },
    orderBy: [
      { featuredOrder: "asc" }, // Custom order first
      { featuredAt: "desc" }, // Then by when featured
      { viewCount: "desc" }, // Fallback to view count
    ],
    take: limit,
  });
}

/**
 * Toggle featured status of a blog post
 */
export async function togglePostFeatured(postId: string, featured: boolean) {
  return prisma.blogPost.update({
    where: { id: postId },
    data: {
      featured,
      featuredAt: featured ? new Date() : null,
    },
  });
}

/**
 * Update featured post order
 */
export async function updateFeaturedPostOrder(postId: string, order: number) {
  return prisma.blogPost.update({
    where: { id: postId },
    data: { featuredOrder: order },
  });
}

/**
 * Get a single blog post by slug
 */
export async function getBlogPostBySlug(
  slug: string
): Promise<BlogPostWithDetails | null> {
  return prisma.blogPost.findUnique({
    where: { slug },
    include: {
      author: {
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          bio: true,
        },
      },
      categories: true,
      tags: true,
      comments: {
        where: { approved: true },
        include: {
          author: {
            select: {
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/**
 * Get related posts based on categories and tags
 */
export async function getRelatedPosts(postId: string, limit = 3) {
  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    include: { categories: true, tags: true },
  });

  if (!post) return [];

  const categoryIds = post.categories.map((c) => c.id);
  const tagIds = post.tags.map((t) => t.id);

  return prisma.blogPost.findMany({
    where: {
      id: { not: postId },
      published: true,
      OR: [
        { categories: { some: { id: { in: categoryIds } } } },
        { tags: { some: { id: { in: tagIds } } } },
      ],
    },
    include: {
      author: {
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          bio: true,
        },
      },
      categories: true,
      tags: true,
    },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

/**
 * Get blog category by slug
 */
export async function getBlogCategory(slug: string) {
  return prisma.blogCategory.findUnique({
    where: { slug },
  });
}

/**
 * Get all blog posts in a category
 */
export async function getBlogPostsByCategory(
  categorySlug: string,
  { page = 1, perPage = 12 }: { page?: number; perPage?: number } = {}
) {
  const skip = (page - 1) * perPage;

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where: {
        published: true,
        categories: { some: { slug: categorySlug } },
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            bio: true,
          },
        },
        categories: true,
        tags: true,
      },
      orderBy: { publishedAt: "desc" },
      skip,
      take: perPage,
    }),
    prisma.blogPost.count({
      where: {
        published: true,
        categories: { some: { slug: categorySlug } },
      },
    }),
  ]);

  return { posts, total };
}

/**
 * Get blog tag by slug
 */
export async function getBlogTag(slug: string) {
  return prisma.blogTag.findUnique({
    where: { slug },
  });
}

/**
 * Get all blog posts with a tag
 */
export async function getBlogPostsByTag(
  tagSlug: string,
  { page = 1, perPage = 12 }: { page?: number; perPage?: number } = {}
) {
  const skip = (page - 1) * perPage;

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where: {
        published: true,
        tags: { some: { slug: tagSlug } },
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            bio: true,
          },
        },
        categories: true,
        tags: true,
      },
      orderBy: { publishedAt: "desc" },
      skip,
      take: perPage,
    }),
    prisma.blogPost.count({
      where: {
        published: true,
        tags: { some: { slug: tagSlug } },
      },
    }),
  ]);

  return { posts, total };
}

/**
 * Get all categories
 */
export async function getAllCategories() {
  return prisma.blogCategory.findMany({
    orderBy: { name: "asc" },
  });
}

/**
 * Get all tags
 */
export async function getAllTags() {
  return prisma.blogTag.findMany({
    orderBy: { name: "asc" },
  });
}

/**
 * Search blog posts
 */
export async function searchBlogPosts(
  query: string,
  { page = 1, perPage = 12 }: { page?: number; perPage?: number } = {}
) {
  const skip = (page - 1) * perPage;

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where: {
        published: true,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { excerpt: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        author: { select: { id: true, email: true } },
        categories: true,
        tags: true,
      },
      orderBy: { publishedAt: "desc" },
      skip,
      take: perPage,
    }),
    prisma.blogPost.count({
      where: {
        published: true,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { excerpt: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
      },
    }),
  ]);

  return { posts, total };
}
