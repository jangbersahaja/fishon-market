import { prisma } from "@/lib/database/prisma";
import Link from "next/link";

export default async function AdminHome() {
  const [posts, categories, tags] = await Promise.all([
    prisma.blogPost.count(),
    prisma.blogCategory.count(),
    prisma.blogTag.count(),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-500">Posts</div>
          <div className="text-2xl font-bold">{posts}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-500">Categories</div>
          <div className="text-2xl font-bold">{categories}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-500">Tags</div>
          <div className="text-2xl font-bold">{tags}</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Manage Posts</h2>
          <Link
            href="/admin/blog/posts/new"
            className="rounded bg-[#ec2227] px-3 py-2 text-sm font-semibold text-white"
          >
            New Post
          </Link>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Posts listing and CRUD will appear here.
        </p>
      </div>
    </div>
  );
}
