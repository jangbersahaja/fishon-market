"use client";

import {
  deleteBlogPost,
  togglePublishBlogPost,
} from "@/app/admin/blog/posts/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface BlogPostActionsProps {
  postId: string;
  postSlug: string;
  published: boolean;
  featured?: boolean;
}

export default function BlogPostActions({
  postId,
  postSlug,
  published,
  featured = false,
}: BlogPostActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isFeatured, setIsFeatured] = useState(featured);
  const [isTogglingFeatured, setIsTogglingFeatured] = useState(false);

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this post? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteBlogPost(postId);
      router.refresh();
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post. Please try again.");
      setIsDeleting(false);
    }
  };

  const handleTogglePublish = async () => {
    setIsToggling(true);
    try {
      await togglePublishBlogPost(postId);
      router.refresh();
    } catch (error) {
      console.error("Error toggling publish status:", error);
      alert("Failed to update post status. Please try again.");
    } finally {
      setIsToggling(false);
    }
  };

  const handleToggleFeatured = async () => {
    setIsTogglingFeatured(true);
    try {
      const response = await fetch(`/api/admin/blog/posts/${postId}/featured`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ featured: !isFeatured }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle featured status");
      }

      setIsFeatured(!isFeatured);
      router.refresh();
    } catch (error) {
      console.error("Error toggling featured status:", error);
      alert("Failed to update featured status. Please try again.");
    } finally {
      setIsTogglingFeatured(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* View Button (only if published) */}
      {published && (
        <Link
          href={`/blog/${postSlug}`}
          target="_blank"
          className="inline-flex items-center justify-center rounded-md p-2 text-blue-600 hover:bg-blue-50 transition-colors"
          title="View post"
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
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </Link>
      )}

      {/* Edit Button */}
      <Link
        href={`/admin/blog/posts/edit/${postId}`}
        className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 transition-colors"
        title="Edit post"
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
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </Link>

      {/* Featured Toggle */}
      <button
        onClick={handleToggleFeatured}
        disabled={isTogglingFeatured}
        className={`inline-flex items-center justify-center rounded-md p-2 transition-colors ${
          isFeatured
            ? "text-yellow-600 hover:bg-yellow-50"
            : "text-gray-400 hover:bg-gray-100"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isFeatured ? "Remove from featured" : "Mark as featured"}
      >
        {isTogglingFeatured ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className="h-4 w-4"
            fill={isFeatured ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        )}
      </button>

      {/* Publish/Unpublish Toggle */}
      <button
        onClick={handleTogglePublish}
        disabled={isToggling}
        className={`inline-flex items-center justify-center rounded-md p-2 transition-colors ${
          published
            ? "text-orange-600 hover:bg-orange-50"
            : "text-green-600 hover:bg-green-50"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={published ? "Unpublish post" : "Publish post"}
      >
        {isToggling ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : published ? (
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
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
            />
          </svg>
        ) : (
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
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>

      {/* Delete Button */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="inline-flex items-center justify-center rounded-md p-2 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Delete post"
      >
        {isDeleting ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
