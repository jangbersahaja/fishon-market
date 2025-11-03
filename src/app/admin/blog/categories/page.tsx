"use client";

import CategoryActions from "@/components/admin/CategoryActions";
import CreateCategoryModal from "@/components/admin/CreateCategoryModal";
import { useState, useEffect } from "react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count: {
    posts: number;
  };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/blog/categories");
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    fetchCategories(); // Refresh categories after modal closes
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Loading categories...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-600">
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
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
          Create New Category
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden bg-white rounded-lg shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-700 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-700 uppercase">
                  Slug
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-700 uppercase">
                  Description
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-700 uppercase">
                  Posts
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">
                      {category.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    /{category.slug}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className="line-clamp-2">
                      {category.description || (
                        <span className="italic text-gray-400">
                          No description
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {category._count.posts}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      <CategoryActions
                        categoryId={category.id}
                        categorySlug={category.slug}
                        postCount={category._count.posts}
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
      <div className="space-y-4 md:hidden">
        {categories.map((category) => (
          <div
            key={category.id}
            className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            {/* Title and Post Count */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900">{category.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">/{category.slug}</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full whitespace-nowrap">
                <svg
                  className="w-3 h-3"
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
                {category._count.posts}
              </span>
            </div>

            {/* Description */}
            {category.description && (
              <p className="mb-3 text-sm text-gray-600 line-clamp-2">
                {category.description}
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end pt-3 border-t border-gray-100">
              <CategoryActions
                categoryId={category.id}
                categorySlug={category.slug}
                postCount={category._count.posts}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {categories.length === 0 && (
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
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No categories yet
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Create categories to organize your blog posts.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#EC2227] px-4 py-2 text-sm font-medium text-white hover:bg-[#c81e23] transition-colors"
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
            Create New Category
          </button>
        </div>
      )}

      {/* Modal */}
      <CreateCategoryModal isOpen={isModalOpen} onClose={handleModalClose} />
    </div>
  );
}
