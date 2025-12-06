import { prisma } from "@/lib/database/prisma";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog Categories | Fishon.my",
  description:
    "Browse all blog categories on Fishon.my - Fishing tips, techniques, destinations, gear, and more.",
  alternates: {
    canonical: "https://www.fishon.my/blog/categories",
  },
};

type RouteParams = Promise<{ locale: string }>;

export default async function BlogCategoriesPage({
  params,
}: {
  params: RouteParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const categories = await prisma.blogCategory.findMany({
    include: {
      _count: {
        select: { posts: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Filter out categories with no posts
  const categoriesWithPosts = categories.filter((c) => c._count.posts > 0);

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#ec2227] to-[#c41d22] text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <nav className="mb-4 text-sm text-white/80" aria-label="Breadcrumb">
            <Link href={`/${locale}/blog`} className="hover:text-white">
              Blog
            </Link>{" "}
            / <span className="text-white">Categories</span>
          </nav>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Browse by Category
          </h1>
          <p className="mt-4 text-lg/7 text-white/90">
            Explore our collection of fishing articles organized by topic.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {categoriesWithPosts.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
            <p className="text-gray-600">
              No categories with posts yet. Check back soon!
            </p>
            <Link
              href={`/${locale}/blog`}
              className="mt-4 inline-block text-[#ec2227] hover:underline"
            >
              ← Back to all articles
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categoriesWithPosts.map((category) => (
              <Link
                key={category.id}
                href={`/blog/category/${category.slug}`}
                className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 group-hover:text-[#ec2227] transition-colors">
                      {category.name}
                    </h2>
                    {category.description && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    {category._count.posts} article
                    {category._count.posts !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[#ec2227] group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
