import BlogPostCard from "@/components/blog/BlogPostCard";
import {
  getBlogCategory,
  getBlogPostsByCategory,
} from "@/lib/services/blog-service";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getBlogCategory(slug);

  if (!category) {
    return {
      title: "Category Not Found | Fishon.my",
    };
  }

  return {
    title: `${category.name} Articles | Fishon.my`,
    description:
      category.description ||
      `Browse all articles about ${category.name} on Fishon.my`,
    alternates: {
      canonical: `https://www.fishon.my/blog/category/${slug}`,
    },
    openGraph: {
      title: `${category.name} Articles | Fishon.my`,
      description:
        category.description ||
        `Browse all articles about ${category.name} on Fishon.my`,
      url: `https://www.fishon.my/blog/category/${slug}`,
      siteName: "Fishon.my",
      type: "website",
    },
  };
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;
  const perPage = 12;

  const category = await getBlogCategory(slug);

  if (!category) {
    notFound();
  }

  const { posts, total } = await getBlogPostsByCategory(slug, {
    page,
    perPage,
  });
  const totalPages = Math.ceil(total / perPage);

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#ec2227] to-[#c41d22] text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <nav className="mb-4 text-sm text-white/80" aria-label="Breadcrumb">
            <Link href="/blog" className="hover:text-white">
              Blog
            </Link>{" "}
            / <span className="text-white">{category.name}</span>
          </nav>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-4 text-lg/7 text-white/90">
              {category.description}
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {posts.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
            <p className="text-gray-600">
              No articles in this category yet. Check back soon!
            </p>
            <Link
              href="/blog"
              className="mt-4 inline-block text-[#ec2227] hover:underline"
            >
              ← Back to all articles
            </Link>
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
                className="mt-12 flex justify-center gap-2"
                aria-label="Pagination"
              >
                {page > 1 && (
                  <Link
                    href={`/blog/category/${slug}?page=${page - 1}`}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <Link
                      key={p}
                      href={`/blog/category/${slug}?page=${p}`}
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
                    href={`/blog/category/${slug}?page=${page + 1}`}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}
