import { prisma } from "@/lib/database/prisma";
import Link from "next/link";

async function getDashboardStats() {
  const [
    totalPosts,
    publishedPosts,
    totalComments,
    pendingComments,
    totalSubscribers,
    totalCategories,
    totalTags,
  ] = await Promise.all([
    prisma.blogPost.count(),
    prisma.blogPost.count({ where: { published: true } }),
    prisma.blogComment.count(),
    prisma.blogComment.count({ where: { approved: false } }),
    prisma.newsletterSubscription.count({ where: { active: true } }),
    prisma.blogCategory.count(),
    prisma.blogTag.count(),
  ]);

  return {
    totalPosts,
    publishedPosts,
    draftPosts: totalPosts - publishedPosts,
    totalComments,
    pendingComments,
    totalSubscribers,
    totalCategories,
    totalTags,
  };
}

export default async function AdminBlogDashboard() {
  const stats = await getDashboardStats();

  const statCards = [
    {
      title: "Total Posts",
      value: stats.totalPosts,
      subtitle: `${stats.publishedPosts} published, ${stats.draftPosts} drafts`,
      link: "/admin/blog/posts",
      color: "bg-blue-500",
    },
    {
      title: "Comments",
      value: stats.totalComments,
      subtitle: `${stats.pendingComments} pending approval`,
      link: "/admin/blog/comments",
      color: "bg-green-500",
    },
    {
      title: "Newsletter Subscribers",
      value: stats.totalSubscribers,
      subtitle: "Active subscriptions",
      link: "/admin/blog/newsletter",
      color: "bg-purple-500",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Blog Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Manage your blog content, comments, and subscribers
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {statCards.map((card) => (
          <Link
            key={card.title}
            href={card.link}
            className="block rounded-lg bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className={`${card.color} h-12 w-12 rounded-lg`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500">{card.subtitle}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Link
              href="/admin/blog/posts/new"
              className="block rounded-md bg-[#EC2227] px-4 py-2 text-center text-white hover:opacity-90"
            >
              Create New Post
            </Link>
            <Link
              href="/admin/blog/comments"
              className="block rounded-md border border-gray-300 px-4 py-2 text-center text-gray-700 hover:bg-gray-50"
            >
              Review Comments
            </Link>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Organization
          </h2>
          <div className="space-y-3">
            <Link
              href="/admin/blog/categories"
              className="flex items-center justify-between rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              <span>Categories</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                {stats.totalCategories}
              </span>
            </Link>
            <Link
              href="/admin/blog/tags"
              className="flex items-center justify-between rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              <span>Tags</span>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
                {stats.totalTags}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
