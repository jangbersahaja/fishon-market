import { prisma } from "@/lib/database/prisma";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog Tags | Fishon.my",
  description:
    "Browse all blog tags on Fishon.my - Find articles by fishing topics, species, techniques, and locations.",
  alternates: {
    canonical: "https://www.fishon.my/blog/tags",
  },
};

export default async function BlogTagsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tags = await prisma.blogTag.findMany({
    include: {
      _count: {
        select: { posts: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Filter out tags with no posts
  const tagsWithPosts = tags.filter((t) => t._count.posts > 0);

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#ec2227] to-[#c41d22] text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <nav className="mb-4 text-sm text-white/80" aria-label="Breadcrumb">
            <Link href={`/${locale}/blog`} className="hover:text-white">
              Blog
            </Link>{" "}
            / <span className="text-white">Tags</span>
          </nav>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Browse by Tag
          </h1>
          <p className="mt-4 text-lg/7 text-white/90">
            Discover articles by fishing topics, species, techniques, and more.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {tagsWithPosts.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
            <p className="text-gray-600">
              No tags with posts yet. Check back soon!
            </p>
            <Link
              href={`/${locale}/blog`}
              className="mt-4 inline-block text-[#ec2227] hover:underline"
            >
              ← Back to all articles
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {tagsWithPosts.map((tag) => (
              <Link
                key={tag.id}
                href={`/blog/tag/${tag.slug}`}
                className="group inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#ec2227] hover:bg-[#ec2227] hover:text-white transition-all"
              >
                <span>#{tag.name}</span>
                <span className="inline-flex items-center justify-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 group-hover:bg-white/20 group-hover:text-white transition-colors">
                  {tag._count.posts}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
