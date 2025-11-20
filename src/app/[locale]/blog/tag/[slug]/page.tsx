import BlogPostCard from "@/components/blog/BlogPostCard";
import { getBlogPostsByTag, getBlogTag } from "@/lib/services/blog-service";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getBlogTag(slug);

  if (!tag) {
    return {
      title: "Tag Not Found | Fishon.my",
    };
  }

  return {
    title: `${tag.name} Articles | Fishon.my`,
    description: `Browse all articles tagged with ${tag.name} on Fishon.my`,
    alternates: {
      canonical: `https://www.fishon.my/blog/tag/${slug}`,
    },
  };
}

export default async function BlogTagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;
  const perPage = 12;

  const tag = await getBlogTag(slug);

  if (!tag) {
    notFound();
  }

  const { posts, total } = await getBlogPostsByTag(slug, { page, perPage });
  const totalPages = Math.ceil(total / perPage);

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#ec2227] to-[#c41d22] text-white">
        <div className="px-4 py-16 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <nav className="mb-4 text-sm text-white/80" aria-label="Breadcrumb">
            <Link href="/blog" className="hover:text-white">
              Blog
            </Link>{" "}
            / <span className="text-white">#{tag.name}</span>
          </nav>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            #{tag.name}
          </h1>
          <p className="mt-4 text-lg/7 text-white/90">
            All articles tagged with {tag.name}
          </p>
        </div>
      </section>

      <div className="px-4 py-12 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {posts.length === 0 ? (
          <div className="p-12 text-center border border-gray-200 rounded-lg bg-gray-50">
            <p className="text-gray-600">
              No articles with this tag yet. Check back soon!
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
                className="flex justify-center gap-2 mt-12"
                aria-label="Pagination"
              >
                {page > 1 && (
                  <Link
                    href={`/blog/tag/${slug}?page=${page - 1}`}
                    className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <Link
                      key={p}
                      href={`/blog/tag/${slug}?page=${p}`}
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
                    href={`/blog/tag/${slug}?page=${page + 1}`}
                    className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50"
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
