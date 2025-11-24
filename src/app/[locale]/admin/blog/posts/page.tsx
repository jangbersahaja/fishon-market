"use client";

import BlogPostActions from "@/components/admin/BlogPostActions";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Author {
  email: string;
  name: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  featured: boolean;
  viewCount: number;
  createdAt: string;
  author: Author;
  categories: Category[];
  tags: Tag[];
}

interface PostsResponse {
  posts: BlogPost[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export default function BlogPostsListPage() {
  const locale = useLocale();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "draft"
  >("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  // Available categories and tags for filters
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, []);

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery, statusFilter, categoryFilter, tagFilter]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/blog/categories");
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/admin/blog/tags");
      const data = await response.json();
      setTags(data);
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  };

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: "12",
        ...(searchQuery && { q: searchQuery }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(tagFilter && { tag: tagFilter }),
      });

      const response = await fetch(`/api/admin/blog/posts?${params}`);
      const data: PostsResponse = await response.json();

      setPosts(data.posts);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
    fetchPosts();
  };

  const handleFilterChange = () => {
    setPage(1); // Reset to first page on filter change
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Loading posts...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog Posts</h1>
          <p className="text-sm text-gray-600">
            {total} total post{total !== 1 ? "s" : ""} •{" "}
            {posts.filter((p) => p.published).length} published on this page
          </p>
        </div>
        <Link
          href={`/${locale}/admin/blog/posts/new`}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#EC2227] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#c81e23] transition-colors"
        >
          <svg
            className="w-4 h-4"
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
          Create New Post
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="p-4 mb-6 bg-white rounded-lg shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts by title, content..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-[#ec2227] focus:outline-none focus:ring-2 focus:ring-[#ec2227]/20"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#EC2227] px-6 py-2 text-sm font-medium text-white hover:bg-[#c81e23] transition-colors"
            >
              Search
            </button>
          </div>

          {/* Filters */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Status Filter */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(
                    e.target.value as "all" | "published" | "draft"
                  );
                  handleFilterChange();
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#ec2227] focus:outline-none focus:ring-2 focus:ring-[#ec2227]/20"
              >
                <option value="all">All Posts</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  handleFilterChange();
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#ec2227] focus:outline-none focus:ring-2 focus:ring-[#ec2227]/20"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tag Filter */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Tag
              </label>
              <select
                value={tagFilter}
                onChange={(e) => {
                  setTagFilter(e.target.value);
                  handleFilterChange();
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#ec2227] focus:outline-none focus:ring-2 focus:ring-[#ec2227]/20"
              >
                <option value="">All Tags</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.slug}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchQuery ||
            statusFilter !== "all" ||
            categoryFilter ||
            tagFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setCategoryFilter("");
                setTagFilter("");
                setPage(1);
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear all filters
            </button>
          )}
        </form>
      </div>

      {/* Desktop Table View */}
      <div className="hidden bg-white rounded-lg shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-700 uppercase">
                  Title
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-700 uppercase">
                  Author
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-700 uppercase">
                  Categories
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-700 uppercase">
                  Tags
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-700 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-700 uppercase">
                  Views
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-700 uppercase">
                  Created
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {post.title}
                        </span>
                        {post.featured && (
                          <svg
                            className="w-4 h-4 text-yellow-500"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            aria-label="Featured post"
                          >
                            <title>Featured</title>
                            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        /{post.slug}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {post.author.name || post.author.email}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {post.categories.length > 0 ? (
                        post.categories.map((category) => (
                          <span
                            key={category.id}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 rounded-md bg-blue-50"
                          >
                            {category.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {post.tags.length > 0 ? (
                        post.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md"
                          >
                            #{tag.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">None</span>
                      )}
                      {post.tags.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{post.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        post.published
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {post.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {post.viewCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      <BlogPostActions
                        postId={post.id}
                        postSlug={post.slug}
                        published={post.published}
                        featured={post.featured}
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
      <div className="space-y-4 lg:hidden">
        {posts.map((post) => (
          <div
            key={post.id}
            className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            {/* Title and Status */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900 truncate">
                    {post.title}
                  </h3>
                  {post.featured && (
                    <svg
                      className="flex-shrink-0 w-4 h-4 text-yellow-500"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-label="Featured post"
                    >
                      <title>Featured</title>
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  /{post.slug}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold whitespace-nowrap ${
                  post.published
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {post.published ? "Published" : "Draft"}
              </span>
            </div>

            {/* Meta Info */}
            <div className="flex items-center gap-4 mb-3 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span className="truncate">
                  {post.author.name || post.author.email}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <span>{post.viewCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Categories and Tags */}
            <div className="flex flex-wrap gap-2 mb-3">
              {post.categories.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {post.categories.map((category) => (
                    <span
                      key={category.id}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 rounded-md bg-blue-50"
                    >
                      {category.name}
                    </span>
                  ))}
                </div>
              )}
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md"
                    >
                      #{tag.name}
                    </span>
                  ))}
                  {post.tags.length > 3 && (
                    <span className="self-center text-xs text-gray-500">
                      +{post.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-3 border-t border-gray-100">
              <BlogPostActions
                postId={post.id}
                postSlug={post.slug}
                published={post.published}
                featured={post.featured}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`rounded-md border px-4 py-2 text-sm font-medium ${
                    pageNum === page
                      ? "border-[#ec2227] bg-[#ec2227] text-white"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Empty State */}
      {posts.length === 0 && (
        <div className="p-12 text-center bg-white rounded-lg shadow-sm">
          <svg
            className="w-12 h-12 mx-auto text-gray-400"
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
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No blog posts found
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            {searchQuery ||
            statusFilter !== "all" ||
            categoryFilter ||
            tagFilter
              ? "Try adjusting your search or filters."
              : "Get started by creating your first blog post."}
          </p>
          {(searchQuery ||
            statusFilter !== "all" ||
            categoryFilter ||
            tagFilter) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setCategoryFilter("");
                setTagFilter("");
                setPage(1);
              }}
              className="mt-4 text-sm text-[#ec2227] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
