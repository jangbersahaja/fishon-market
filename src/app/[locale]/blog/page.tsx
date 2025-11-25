import BlogPostCard from "@/components/blog/BlogPostCard";
import FeaturedPostCard from "@/components/blog/FeaturedPostCard";
import SearchBar from "@/components/blog/SearchBar";
import { prisma } from "@/lib/database/prisma";
import { getBlogPosts, getFeaturedPosts } from "@/lib/services/blog-service";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Fishing Blog & Guides | Fishon.my",
  description:
    "Discover expert fishing tips, charter guides, destination reviews, and techniques for Malaysian waters. Learn from local anglers and captains.",
  alternates: {
    canonical: "https://www.fishon.my/blog",
  },
};

// JSON-LD structured data for blog
const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Fishon.my Fishing Blog",
  description:
    "Expert fishing tips, charter guides, and destination reviews for Malaysian anglers",
  url: "https://www.fishon.my/blog",
  inLanguage: "en-MY",
  publisher: {
    "@type": "Organization",
    name: "Fishon.my",
    url: "https://www.fishon.my",
    logo: {
      "@type": "ImageObject",
      url: "https://www.fishon.my/favicon.ico",
    },
  },
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    category?: string;
    tag?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const perPage = 12;

  // Parse search filters
  const filters = {
    page,
    perPage,
    query: params.q,
    categorySlug: params.category,
    tagSlug: params.tag,
    dateFrom: params.from ? new Date(params.from) : undefined,
    dateTo: params.to ? new Date(params.to) : undefined,
  };

  const { posts, total } = await getBlogPosts(filters);
  const featuredPosts = await getFeaturedPosts(3);
  const totalPages = Math.ceil(total / perPage);

  // Fetch real categories
  const categories = await prisma.blogCategory.findMany({
    orderBy: { name: "asc" },
    take: 6, // Show top 6 categories
  });

  return (
    <main className="min-h-screen bg-white">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#ec2227] to-[#c41d22] text-white">
        <div className="px-4 py-16 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Fishing Blog & Guides
          </h1>
          <p className="mt-4 text-lg/7 text-white/90">
            Expert tips, destination guides, and fishing techniques for
            Malaysian waters. Learn from experienced anglers and charter
            captains.
          </p>

          {/* Search Bar */}
          <div className="mt-6">
            <SearchBar />
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <nav
              className="flex flex-wrap gap-2 mt-8"
              aria-label="Blog categories"
            >
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/blog/category/${category.slug}`}
                  className="px-4 py-2 text-sm font-medium transition rounded-full bg-white/20 hover:bg-white/30"
                >
                  {category.name}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </section>

      <div className="px-4 py-12 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-bold">Featured Articles</h2>

            {/* Desktop: Large card on left, small cards on right */}
            {/* Mobile: Stacked - large card first, then small cards */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* First featured post - Large card */}
              <div className="lg:col-span-1">
                <FeaturedPostCard post={featuredPosts[0]} variant="large" />
              </div>

              {/* Other featured posts - Small cards in vertical list */}
              {featuredPosts.length > 1 && (
                <div className="flex flex-col gap-4 lg:col-span-1">
                  {featuredPosts.slice(1).map((post) => (
                    <FeaturedPostCard
                      key={post.id}
                      post={post}
                      variant="small"
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Recent Posts */}
        <section>
          <h2 className="mb-6 text-2xl font-bold">Recent Articles</h2>

          {posts.length === 0 ? (
            <div className="p-12 text-center border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-gray-600">
                No blog posts yet. Check back soon for fishing tips and guides!
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <BlogPostCard key={post.id} post={post} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav
                  className="flex justify-center gap-2 mt-12"
                  aria-label="Pagination"
                >
                  {page > 1 && (
                    <Link
                      href={`/blog?page=${page - 1}`}
                      className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Previous
                    </Link>
                  )}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <Link
                        key={p}
                        href={`/blog?page=${p}`}
                        className={`rounded-md border px-4 py-2 text-sm font-medium ${
                          p === page
                            ? "border-[#ec2227] bg-[#ec2227] text-white"
                            : "border-gray-300 hover:bg-gray-50"
                        }`}
                        aria-current={p === page ? "page" : undefined}
                      >
                        {p}
                      </Link>
                    )
                  )}
                  {page < totalPages && (
                    <Link
                      href={`/blog?page=${page + 1}`}
                      className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Next
                    </Link>
                  )}
                </nav>
              )}
            </>
          )}
        </section>

        {/* Newsletter Signup */}
        <section className="mt-16 rounded-2xl bg-gradient-to-r from-[#ec2227]/10 to-[#ec2227]/5 p-8 text-center">
          <h2 className="text-2xl font-bold">Stay Updated</h2>
          <p className="mt-2 text-gray-600">
            Get the latest fishing tips and destination guides delivered to your
            inbox.
          </p>
          <form className="flex flex-col justify-center gap-3 mt-6 sm:flex-row">
            <input
              type="email"
              placeholder="Enter your email"
              className="rounded-lg border border-gray-300 px-4 py-2 focus:border-[#ec2227] focus:outline-none focus:ring-2 focus:ring-[#ec2227]/20"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#ec2227] px-6 py-2 font-semibold text-white hover:bg-[#c41d22] transition"
            >
              Subscribe
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
