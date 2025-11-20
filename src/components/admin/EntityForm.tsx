"use client";

import type { BlogCategory, BlogTag } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { generateSlug } from "@/utils/slugify";

interface EntityFormProps {
  entity?: BlogCategory | BlogTag;
  onSubmit: (formData: FormData) => Promise<void | { success: boolean }>;
  entityType: "category" | "tag";
  hasDescription?: boolean;
}

export default function EntityForm({
  entity,
  onSubmit,
  entityType,
  hasDescription = false,
}: EntityFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(entity?.name || "");
  const [slug, setSlug] = useState(entity?.slug || "");
  const [description, setDescription] = useState(
    "description" in (entity || {}) ? (entity as BlogCategory).description || "" : ""
  );

  const entityLabel = entityType === "category" ? "Category" : "Tag";
  const entityPlaceholder =
    entityType === "category" ? "Fishing Tips" : "Deep Sea";
  const slugPlaceholder =
    entityType === "category" ? "fishing-tips" : "deep-sea";

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    // Auto-generate slug only if creating new entity
    if (!entity) {
      setSlug(generateSlug(newName));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      await onSubmit(formData);
      // The server action will handle the redirect
    } catch (error) {
      console.error("Error submitting form:", error);
      alert(`Error saving ${entityType}. Please try again.`);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Name <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={name}
          onChange={handleNameChange}
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#ec2227] focus:outline-none focus:ring-2 focus:ring-[#ec2227]/20"
          placeholder={`e.g., ${entityPlaceholder}`}
        />
      </div>

      {/* Slug */}
      <div>
        <label
          htmlFor="slug"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Slug <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#ec2227] focus:outline-none focus:ring-2 focus:ring-[#ec2227]/20"
          placeholder={`e.g., ${slugPlaceholder}`}
        />
        <p className="mt-1 text-xs text-gray-500">
          URL-friendly version of the name. Used in URLs.
        </p>
      </div>

      {/* Description (optional, only for categories) */}
      {hasDescription && (
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#ec2227] focus:outline-none focus:ring-2 focus:ring-[#ec2227]/20"
            placeholder={`Brief description of this ${entityType}...`}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-[#EC2227] px-4 py-2 text-sm font-medium text-white hover:bg-[#c81e23] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? "Saving..."
            : entity
              ? `Update ${entityLabel}`
              : `Create ${entityLabel}`}
        </button>
      </div>
    </form>
  );
}
