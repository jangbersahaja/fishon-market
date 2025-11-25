import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog Admin Dashboard | Fishon.my",
  description: "Manage blog posts, comments, and newsletter subscriptions",
  robots: "noindex, nofollow",
};

export default async function AdminBlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="px-4 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="" className="text-xl font-bold text-[#EC2227]">
                Admin
              </Link>
              <nav className="flex gap-6">
                <Link
                  href="/admin/blog"
                  className="text-sm font-medium text-gray-700 hover:text-[#EC2227]"
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/blog/posts"
                  className="text-sm font-medium text-gray-700 hover:text-[#EC2227]"
                >
                  Posts
                </Link>
                <Link
                  href="/admin/blog/categories"
                  className="text-sm font-medium text-gray-700 hover:text-[#EC2227]"
                >
                  Categories
                </Link>
                <Link
                  href="/admin/blog/tags"
                  className="text-sm font-medium text-gray-700 hover:text-[#EC2227]"
                >
                  Tags
                </Link>
                <Link
                  href="/admin/blog/comments"
                  className="text-sm font-medium text-gray-700 hover:text-[#EC2227]"
                >
                  Comments
                </Link>
                <Link
                  href="/admin/blog/newsletter"
                  className="text-sm font-medium text-gray-700 hover:text-[#EC2227]"
                >
                  Newsletter
                </Link>
              </nav>
            </div>
            <Link
              href="/blog"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              View Blog →
            </Link>
          </div>
        </div>
      </header>
      <main className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
