"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { PhotoGallery, type Media } from "./PhotoGallery";
import { VideoGallery, type VideoGalleryItem } from "./VideoGallery";

interface GalleryTabsProps {
  photos: Media[];
  videos: VideoGalleryItem[];
  charterId?: string;
  ownerId?: string;
  userId?: string;
  title: string;
}

type Tab = "photos" | "videos";

export function GalleryTabs({
  photos,
  videos,
  charterId,
  ownerId,
  userId,
  title,
}: GalleryTabsProps) {
  const hasPhotos = photos && photos.length > 0;
  const hasVideos = videos && videos.length > 0;

  // Determine initial tab
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (hasPhotos) return "photos";
    if (hasVideos) return "videos";
    return "photos";
  });

  // If only one type of content exists, just render that gallery without tabs
  if (hasPhotos && !hasVideos) {
    return (
      <PhotoGallery
        images={photos}
        title={title}
        charterId={charterId}
        ownerId={ownerId}
        userId={userId}
      />
    );
  }

  if (!hasPhotos && hasVideos) {
    return (
      <VideoGallery
        videos={videos}
        charterId={charterId}
        ownerId={ownerId}
        userId={userId}
      />
    );
  }

  if (!hasPhotos && !hasVideos) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs Header */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("photos")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "photos"
              ? "border-[#ec2227] text-[#ec2227]"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          Photos ({photos.length})
        </button>
        <button
          onClick={() => setActiveTab("videos")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "videos"
              ? "border-[#ec2227] text-[#ec2227]"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          Videos ({videos.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {activeTab === "photos" ? (
          <PhotoGallery
            images={photos}
            title={title}
            charterId={charterId}
            ownerId={ownerId}
            userId={userId}
          />
        ) : (
          <VideoGallery
            videos={videos}
            charterId={charterId}
            ownerId={ownerId}
            userId={userId}
          />
        )}
      </div>
    </div>
  );
}
