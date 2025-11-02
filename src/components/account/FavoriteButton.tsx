"use client";

import { useAuthModal } from "@/components/auth/AuthModalContext";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface FavoriteButtonProps {
  captainCharterId: string;
  charterName: string;
  location: string;
  initialIsFavorited?: boolean;
  charterData?: any; // Full charter object for storage
  className?: string;
  showLabel?: boolean;
}

export function FavoriteButton({
  captainCharterId,
  charterName,
  location,
  initialIsFavorited = false,
  charterData,
  className = "",
  showLabel = false,
}: FavoriteButtonProps) {
  const { data: session } = useSession();
  const { openModal } = useAuthModal();
  const router = useRouter();
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Require authentication
    if (!session?.user) {
      openModal("signin", undefined, { showHomeButton: false });
      return;
    }

    setIsLoading(true);

    try {
      if (isFavorited) {
        // Remove from favorites
        const response = await fetch(
          `/api/account/favorites?charterId=${captainCharterId}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to remove favorite");
        }

        setIsFavorited(false);
      } else {
        // Add to favorites
        const response = await fetch("/api/account/favorites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            captainCharterId,
            charterName,
            location,
            charterData,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to add favorite");
        }

        setIsFavorited(true);
      }

      // Refresh the page data
      router.refresh();
    } catch (error) {
      console.error("Favorite toggle error:", error);
      // Revert optimistic update on error
      setIsFavorited(!isFavorited);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine icon size based on button size in className
  const isLargeButton =
    className.includes("w-12") || className.includes("h-12");
  const iconSize = isLargeButton ? "h-6 w-6" : "h-5 w-5";

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-full p-2 transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
        isFavorited
          ? "bg-red-100 text-red-600"
          : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600"
      } ${className}`}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={`${iconSize} ${
          isFavorited ? "fill-current" : ""
        } transition-all`}
      />
      {showLabel && (
        <span className="text-sm font-medium">
          {isFavorited ? "Saved" : "Save"}
        </span>
      )}
    </button>
  );
}
