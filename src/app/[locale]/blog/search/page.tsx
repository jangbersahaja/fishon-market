import BlogPostCard from "@/components/blog/BlogPostCard";
import SearchBar from "@/components/blog/SearchBar";
import { prisma } from "@/lib/database/prisma";
import Link from "next/link";

async function searchPosts(query: string, category?: string, tag?: string) {
  const where: any = { published: true };

  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { excerpt: { contains: query, mode: "insensitive" } },
      { content: { contains: query, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.categories = { some: { slug: category } };
  }

  if (tag) {
    where.tags = { some: { slug: tag } };
  }

  return prisma.blogPost.findMany({
    where,
    include: {
      author: {
        select: {
          id: true,
          email: true,
          name: true,
          bio: true,
          image: true,
        },
      },
      categories: true,
      tags: true,
    },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });
}

export default async function BlogSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const category = params.category;
  const tag = params.tag;

  const posts = await searchPosts(query, category, tag);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-4 text-3xl font-bold text-gray-900">Search Blog</h1>
          <SearchBar initialQuery={query} />
        </div>

        {(query || category || tag) && (
          <div className="mb-6">
            <p className="text-gray-600">
              Found {posts.length} result{posts.length !== 1 ? "s" : ""}
              {query && ` for "${query}"`}
              {category && ` in category "${category}"`}
              {tag && ` with tag "${tag}"`}
            </p>
          </div>
        )}

        {posts.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogPostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 p-12 text-center">
            <p className="mb-4 text-lg text-gray-600">No posts found</p>
            <Link href="/blog" className="text-[#EC2227] hover:underline">
              View all posts →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
