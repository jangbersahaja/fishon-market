"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { generateSlug } from "@/utils/slugify";

interface CreateEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: "category" | "tag";
  createAction: (formData: FormData) => Promise<void | { success: boolean }>;
  hasDescription?: boolean;
}

export default function CreateEntityModal({
  isOpen,
  onClose,
  entityType,
  createAction,
  hasDescription = false,
}: CreateEntityModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [mounted, setMounted] = useState(false);

  const entityLabel = entityType === "category" ? "Category" : "Tag";
  const entityPlaceholder =
    entityType === "category" ? "Fishing Tips" : "Deep Sea";
  const slugPlaceholder =
    entityType === "category" ? "fishing-tips" : "deep-sea";

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    setSlug(generateSlug(newName));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      await createAction(formData);
      // Reset form
      setName("");
      setSlug("");
      setDescription("");
      // Refresh the page to show new entity
      router.refresh();
      onClose();
    } catch (error) {
      console.error(`Error creating ${entityType}:`, error);
      alert(`Error creating ${entityType}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="relative w-full max-w-lg bg-white rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Create New {entityLabel}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block mb-1 text-sm font-medium text-gray-700"
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
                className="block mb-1 text-sm font-medium text-gray-700"
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
                URL-friendly version of the name
              </p>
            </div>

            {/* Description (optional, only for categories) */}
            {hasDescription && (
              <div>
                <label
                  htmlFor="description"
                  className="block mb-1 text-sm font-medium text-gray-700"
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
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#EC2227] px-4 py-2 text-sm font-medium text-white hover:bg-[#c81e23] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating..." : `Create ${entityLabel}`}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
