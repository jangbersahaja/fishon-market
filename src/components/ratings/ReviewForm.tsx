"use client";

import { Button } from "@/components/ui/button";
import { REVIEW_BADGES, type ReviewBadgeId } from "@/utils/reviewBadges";
import { AlertCircle, Loader2, Star, Upload, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface ReviewFormProps {
  bookingId: string;
  charterName: string;
  tripDate: Date;
  location: string;
  onSubmit?: (reviewId: string) => void;
  onCancel?: () => void;
}

interface ReviewFormData {
  overallRating: number;
  badges: ReviewBadgeId[];
  comment: string;
  photos: File[];
  videos: File[];
}

const MAX_VIDEOS = 3;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export default function ReviewForm({
  bookingId,
  charterName,
  tripDate,
  location,
  onSubmit,
  onCancel,
}: ReviewFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ReviewFormData>({
    overallRating: 0,
    badges: [],
    comment: "",
    photos: [],
    videos: [],
  });

  // Star rating handlers
  const [hoveredStar, setHoveredStar] = useState(0);

  const handleStarClick = (rating: number) => {
    setFormData((prev) => ({ ...prev, overallRating: rating }));
  };

  // Badge selection handlers
  const toggleBadge = (badgeId: ReviewBadgeId) => {
    setFormData((prev) => ({
      ...prev,
      badges: prev.badges.includes(badgeId)
        ? prev.badges.filter((id) => id !== badgeId)
        : [...prev.badges, badgeId],
    }));
  };

  // Media upload handlers
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validPhotos = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed for photos");
        return false;
      }
      if (file.size > MAX_PHOTO_SIZE) {
        setError(`Photo "${file.name}" exceeds 10MB limit`);
        return false;
      }
      return true;
    });

    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, ...validPhotos],
    }));
    setError(null);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (formData.videos.length + files.length > MAX_VIDEOS) {
      setError(`Maximum ${MAX_VIDEOS} videos allowed`);
      return;
    }

    const validVideos = files.filter((file) => {
      if (!file.type.startsWith("video/")) {
        setError("Only video files are allowed");
        return false;
      }
      if (file.size > MAX_VIDEO_SIZE) {
        setError(`Video "${file.name}" exceeds 100MB limit`);
        return false;
      }
      return true;
    });

    setFormData((prev) => ({
      ...prev,
      videos: [...prev.videos, ...validVideos],
    }));
    setError(null);
  };

  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const removeVideo = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index),
    }));
  };

  // Helper function to upload a single file
  const uploadFile = async (file: File, mediaType: "photo" | "video") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mediaType", mediaType);

    const response = await fetch("/api/account/reviews/upload-media", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || `Failed to upload ${mediaType}`);
    }

    const result = await response.json();
    return result.url;
  };

  // Form submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setUploadProgress("");
    setError(null);

    try {
      // Upload all photos
      setUploadProgress(`Uploading ${formData.photos.length} photos...`);
      const photoUrls: string[] = [];
      for (let i = 0; i < formData.photos.length; i++) {
        const photo = formData.photos[i];
        try {
          setUploadProgress(
            `Uploading photo ${i + 1}/${formData.photos.length}...`
          );
          const url = await uploadFile(photo, "photo");
          photoUrls.push(url);
        } catch (err) {
          console.error("Failed to upload photo:", photo.name, err);
          throw new Error(`Failed to upload photo: ${photo.name}`);
        }
      }

      // Upload all videos
      if (formData.videos.length > 0) {
        setUploadProgress(`Uploading ${formData.videos.length} videos...`);
        const videoUrls: string[] = [];
        for (let i = 0; i < formData.videos.length; i++) {
          const video = formData.videos[i];
          try {
            setUploadProgress(
              `Uploading video ${i + 1}/${formData.videos.length}...`
            );
            const url = await uploadFile(video, "video");
            videoUrls.push(url);
          } catch (err) {
            console.error("Failed to upload video:", video.name, err);
            throw new Error(`Failed to upload video: ${video.name}`);
          }
        }

        setUploadProgress("Submitting review...");
        // Submit review with uploaded media URLs
        const response = await fetch("/api/account/reviews", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingId,
            overallRating: formData.overallRating,
            badges: formData.badges,
            comment: formData.comment.trim() || undefined,
            photos: photoUrls,
            videos: videoUrls,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to submit review");
        }

        const { review } = await response.json();
        onSubmit?.(review.id);
      } else {
        setUploadProgress("Submitting review...");
        // No videos, just submit with photos
        const response = await fetch("/api/account/reviews", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingId,
            overallRating: formData.overallRating,
            badges: formData.badges,
            comment: formData.comment.trim() || undefined,
            photos: photoUrls,
            videos: [],
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to submit review");
        }

        const { review } = await response.json();
        onSubmit?.(review.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setIsSubmitting(false);
      setUploadProgress("");
    }
  };

  // Step navigation
  const canProceedStep1 = formData.overallRating > 0;
  const canSubmit = formData.overallRating > 0;

  return (
    <div className="space-y-6">
      {/* Header with charter context */}
      <div className="pb-4 border-b">
        <h2 className="mb-2 text-2xl font-semibold">Write a Review</h2>
        <div className="space-y-1 text-sm text-gray-600">
          <p className="font-medium">{charterName}</p>
          <p>{location}</p>
          <p>Trip Date: {new Date(tripDate).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2 p-4 text-red-800 border border-red-200 rounded-lg bg-red-50">
          <AlertCircle className="flex-shrink-0 w-4 h-4" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 w-12 rounded-full transition-colors ${
              s === step
                ? "bg-blue-600"
                : s < step
                ? "bg-blue-300"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Overall Rating */}
      {step === 1 && (
        <div className="py-8 space-y-6">
          <div className="text-center">
            <h3 className="mb-2 text-xl font-semibold">
              How was your experience?
            </h3>
            <p className="text-gray-600">Rate your overall experience</p>
          </div>

          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleStarClick(rating)}
                onMouseEnter={() => setHoveredStar(rating)}
                onMouseLeave={() => setHoveredStar(0)}
                className="transition-transform rounded hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Star
                  className={`w-12 h-12 ${
                    rating <= (hoveredStar || formData.overallRating)
                      ? "fill-amber-400 stroke-amber-400"
                      : "stroke-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>

          {formData.overallRating > 0 && (
            <p className="text-center text-gray-600">
              You rated {formData.overallRating} out of 5 stars
            </p>
          )}

          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              size="lg"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Badges & Comment */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-lg font-semibold">
              What made it special? (Optional)
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Select badges that describe your experience
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {REVIEW_BADGES.map((badge) => (
                <button
                  key={badge.id}
                  type="button"
                  onClick={() => toggleBadge(badge.id as ReviewBadgeId)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    formData.badges.includes(badge.id as ReviewBadgeId)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div className="mb-1 text-2xl">{badge.icon}</div>
                  <div className="text-sm font-medium">{badge.label}</div>
                  <div className="mt-1 text-xs text-gray-600">
                    {badge.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium">
              Your review (Optional)
            </label>
            <textarea
              value={formData.comment}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev) => ({ ...prev, comment: e.target.value }))
              }
              placeholder="Share more about your fishing trip..."
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              {formData.comment.length} characters
            </p>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)} size="lg">
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Photos & Videos */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-lg font-semibold">
              Add photos & videos (Optional)
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Share your best catches and moments
            </p>

            {/* Photo upload */}
            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium">
                Photos (Max 10MB each)
              </label>
              <div className="p-6 text-center transition-colors border-2 border-dashed rounded-lg hover:border-blue-400">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="flex flex-col items-center cursor-pointer"
                >
                  <Upload className="w-8 h-8 mb-2 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Click to upload photos
                  </span>
                </label>
              </div>

              {formData.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <Image
                        src={URL.createObjectURL(photo)}
                        alt={`Preview ${index + 1}`}
                        width={96}
                        height={96}
                        className="object-cover w-full h-24 rounded"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute p-1 text-white transition-opacity bg-red-500 rounded-full opacity-0 top-1 right-1 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="mt-1 text-xs text-gray-500 truncate">
                        {photo.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Video upload */}
            <div>
              <label className="block mb-2 text-sm font-medium">
                Videos (Max 3, up to 100MB each)
              </label>
              <div className="p-6 text-center transition-colors border-2 border-dashed rounded-lg hover:border-blue-400">
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleVideoUpload}
                  className="hidden"
                  id="video-upload"
                  disabled={formData.videos.length >= MAX_VIDEOS}
                />
                <label
                  htmlFor="video-upload"
                  className={`cursor-pointer flex flex-col items-center ${
                    formData.videos.length >= MAX_VIDEOS
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <Upload className="w-8 h-8 mb-2 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Click to upload videos ({formData.videos.length}/
                    {MAX_VIDEOS})
                  </span>
                </label>
              </div>

              {formData.videos.length > 0 && (
                <div className="mt-4 space-y-2">
                  {formData.videos.map((video, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {video.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(video.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVideo(index)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <div className="flex gap-2">
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploadProgress || "Submitting..."}
                  </>
                ) : (
                  "Submit Review"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Info note */}
      <div className="pt-4 text-xs text-center text-gray-500 border-t">
        Your review will be published after admin approval
      </div>
    </div>
  );
}
