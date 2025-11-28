"use client";

import { Image as ImageIcon, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PhotoGallery, type Media } from "./PhotoGallery";
import { VideoGallery, type VideoGalleryItem } from "./VideoGallery";

interface MediaGalleryProps {
  images?: Media[];
  videos?: VideoGalleryItem[];
  title: string;
  charterId?: string;
  ownerId?: string;
  userId?: string;
}

type TabType = "photos" | "videos";

export function MediaGallery({
  images,
  videos,
  title,
  charterId,
  ownerId,
  userId,
}: MediaGalleryProps) {
  const t = useTranslations("charter.mediaGallery");
  const hasImages = Array.isArray(images) && images.length > 0;
  const hasVideos = Array.isArray(videos) && videos.length > 0;

  // Default to photos tab, or videos if no photos
  const [activeTab, setActiveTab] = useState<TabType>(
    hasImages ? "photos" : "videos"
  );

  // If only one type of media, don't show tabs
  const showTabs = hasImages && hasVideos;

  const photoCount = images?.length || 0;
  const videoCount = videos?.length || 0;

  return (
    <div className="overflow-hidden bg-white shadow-lg rounded-2xl">
      {/* Tab Toggle - Only show when both photos and videos exist */}
      {showTabs && (
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab("photos")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "photos"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            {t("photos", { count: photoCount })}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("videos")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "videos"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Video className="w-4 h-4" />
            {t("videos", { count: videoCount })}
          </button>
        </div>
      )}

      {/* Content */}
      <div>
        {activeTab === "photos" && hasImages && (
          <PhotoGallery
            images={images}
            title={title}
            charterId={charterId}
            ownerId={ownerId}
            userId={userId}
          />
        )}
        {activeTab === "videos" && hasVideos && (
          <div className="p-0">
            <VideoGallery
              videos={videos}
              charterId={charterId}
              ownerId={ownerId}
              userId={userId}
              className="border-0 shadow-none rounded-none"
            />
          </div>
        )}
        {/* Fallback if no media */}
        {!hasImages && !hasVideos && (
          <div className="flex items-center justify-center h-64 text-gray-500">
            {t("noMedia")}
          </div>
        )}
      </div>
    </div>
  );
}
