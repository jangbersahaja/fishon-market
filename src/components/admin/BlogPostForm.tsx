"use client";

import type { BlogCategory, BlogPost, BlogTag } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CreateCategoryModal from "./CreateCategoryModal";
import CreateTagModal from "./CreateTagModal";
import ImageUpload from "./ImageUpload";
import NovelEditor from "./NovelEditor";

interface BlogPostFormProps {
  post?: BlogPost & { categories: BlogCategory[]; tags: BlogTag[] };
  allCategories: BlogCategory[];
  allTags: BlogTag[];
  onSubmit: (formData: FormData) => Promise<void>;
  /** Locale for link generation */
  locale: string;
}

export default function BlogPostForm({
  post,
  allCategories,
  allTags,
  onSubmit,
  locale,
}: BlogPostFormProps) {
  const router = useRouter();
  const [content, setContent] = useState(post?.content || "");
  const [coverImage, setCoverImage] = useState(post?.coverImage || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    post?.categories?.map((c) => c.id) || []
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    post?.tags?.map((t) => t.id) || []
  );
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.set("content", content);
    formData.set("coverImage", coverImage);
    formData.set("categoryIds", selectedCategories.join(","));
    formData.set("tagIds", selectedTags.join(","));

    // Auto-generate slug if not provided
    const slug = formData.get("slug") as string;
    if (!slug) {
      const title = formData.get("title") as string;
      formData.set("slug", generateSlug(title));
    }

    try {
      await onSubmit(formData);
      // The server action will handle the redirect
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Error saving post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Post Details</h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700"
            >
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              defaultValue={post?.title}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#EC2227] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="slug"
              className="block text-sm font-medium text-gray-700"
            >
              Slug (auto-generated if empty)
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              defaultValue={post?.slug}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#EC2227] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="excerpt"
              className="block text-sm font-medium text-gray-700"
            >
              Excerpt
            </label>
            <textarea
              id="excerpt"
              name="excerpt"
              rows={3}
              defaultValue={post?.excerpt || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#EC2227] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Content</h2>
        <NovelEditor value={content} onChange={setContent} />
      </div>

      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Cover Image</h2>
        <div className="space-y-4">
          <ImageUpload
            value={coverImage}
            onChange={setCoverImage}
            type="cover"
            label="Upload Cover Image"
            description="Recommended size: 1200x630px. Max 5MB."
          />

          <div>
            <label
              htmlFor="coverImageAlt"
              className="block text-sm font-medium text-gray-700"
            >
              Alt Text (for accessibility)
            </label>
            <input
              type="text"
              id="coverImageAlt"
              name="coverImageAlt"
              defaultValue={post?.coverImageAlt || ""}
              placeholder="Describe the image for screen readers"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#EC2227] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Categories Card */}
        <div className="p-6 bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Categories</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="inline-flex items-center gap-1 text-xs text-[#EC2227] hover:underline"
                title="Create new category"
              >
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New
              </button>
              <span className="text-gray-300">|</span>
              <a
                href={`/${locale}/admin/blog/categories`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#EC2227] hover:underline"
              >
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Manage
              </a>
            </div>
          </div>

          {allCategories.length === 0 ? (
            <div className="p-6 text-center border-2 border-gray-300 border-dashed rounded-lg">
              <svg
                className="w-10 h-10 mx-auto text-gray-400"
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
              <p className="mt-2 text-sm text-gray-600">No categories yet</p>
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-[#EC2227] hover:underline"
              >
                Create your first category
              </button>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-64">
              {allCategories.map((category) => (
                <label
                  key={category.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors ${
                    selectedCategories.includes(category.id)
                      ? "border-[#EC2227] bg-red-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                    className="h-4 w-4 rounded border-gray-300 text-[#EC2227] focus:ring-[#EC2227]"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-gray-900 truncate">
                      {category.name}
                    </span>
                    {category.description && (
                      <span className="block text-xs text-gray-500 truncate">
                        {category.description}
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          <p className="mt-3 text-xs text-gray-500">
            {selectedCategories.length} categor
            {selectedCategories.length !== 1 ? "ies" : "y"} selected
          </p>
        </div>

        {/* Tags Card */}
        <div className="p-6 bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Tags</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTagModal(true)}
                className="inline-flex items-center gap-1 text-xs text-[#EC2227] hover:underline"
                title="Create new tag"
              >
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New
              </button>
              <span className="text-gray-300">|</span>
              <a
                href={`/${locale}/admin/blog/tags`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#EC2227] hover:underline"
              >
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Manage
              </a>
            </div>
          </div>

          {allTags.length === 0 ? (
            <div className="p-6 text-center border-2 border-gray-300 border-dashed rounded-lg">
              <svg
                className="w-10 h-10 mx-auto text-gray-400"
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
              <p className="mt-2 text-sm text-gray-600">No tags yet</p>
              <button
                type="button"
                onClick={() => setShowTagModal(true)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-[#EC2227] hover:underline"
              >
                Create your first tag
              </button>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-64">
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <label
                    key={tag.id}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm transition-colors ${
                      selectedTags.includes(tag.id)
                        ? "border-[#EC2227] bg-red-50 text-[#EC2227]"
                        : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag.id)}
                      onChange={() => toggleTag(tag.id)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-[#EC2227] focus:ring-[#EC2227]"
                    />
                    <span className="font-medium">#{tag.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <p className="mt-3 text-xs text-gray-500">
            {selectedTags.length} tag{selectedTags.length !== 1 ? "s" : ""}{" "}
            selected
          </p>
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Publishing</h2>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="published"
            value="true"
            defaultChecked={post?.published}
            className="border-gray-300 rounded"
          />
          <span className="text-sm font-medium">Publish immediately</span>
        </label>
      </div>

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-[#EC2227] px-6 py-2 text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : post ? "Update Post" : "Create Post"}
        </button>
      </div>

      {/* Modals */}
      <CreateCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
      />
      <CreateTagModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
      />
    </form>
  );
}
