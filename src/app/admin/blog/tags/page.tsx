import TagActions from "@/components/admin/TagActions";
import { prisma } from "@/lib/database/prisma";
import Link from "next/link";

async function getAllTags() {
  return prisma.blogTag.findMany({
    include: {
      _count: {
        select: { posts: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export default async function TagsPage() {
  const tags = await getAllTags();

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tags</h1>
          <p className="text-sm text-gray-600">
            {tags.length} tag{tags.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/blog/tags/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#EC2227] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#c81e23] transition-colors"
        >
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create New Tag
        </Link>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-lg bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Posts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tags.map((tag) => (
                <tr key={tag.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
                      #{tag.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    /{tag.slug}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {tag._count.posts}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(tag.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      <TagActions
                        tagId={tag.id}
                        tagSlug={tag.slug}
                        postCount={tag._count.posts}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="rounded-lg bg-white p-4 shadow-sm border border-gray-200"
          >
            {/* Title and Post Count */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
                  #{tag.name}
                </span>
                <p className="text-xs text-gray-500 mt-2">/{tag.slug}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 whitespace-nowrap">
                <svg
                  className="h-3 w-3"
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
                {tag._count.posts}
              </span>
            </div>

            {/* Meta */}
            <p className="text-xs text-gray-600 mb-3">
              Created {new Date(tag.createdAt).toLocaleDateString()}
            </p>

            {/* Actions */}
            <div className="flex justify-end pt-3 border-t border-gray-100">
              <TagActions
                tagId={tag.id}
                tagSlug={tag.slug}
                postCount={tag._count.posts}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {tags.length === 0 && (
        <div className="rounded-lg bg-white p-12 text-center shadow-sm">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No tags yet
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Create tags to help categorize your blog posts.
          </p>
          <Link
            href="/admin/blog/tags/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#EC2227] px-4 py-2 text-sm font-medium text-white hover:bg-[#c81e23] transition-colors"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create New Tag
          </Link>
        </div>
      )}
    </div>
  );
}
