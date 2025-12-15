"use client";

import { PhoneInput } from "@/components/shared/PhoneInput";
import { RelationshipSelect } from "@/components/shared/RelationshipSelect";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ProfileFormProps {
  user: {
    name: string | null;
    email: string;
    phone: string | null;
    image: string | null;
    streetAddress: string | null;
    city: string | null;
    state: string | null;
    postcode: string | null;
    country: string | null;
    emergencyName: string | null;
    emergencyPhone: string | null;
    emergencyRelation: string | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const t = useTranslations("account.profile");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.image);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: user.name || "",
    phone: user.phone || "",
    streetAddress: user.streetAddress || "",
    city: user.city || "",
    state: user.state || "",
    postcode: user.postcode || "",
    country: user.country || "Malaysia",
    emergencyName: user.emergencyName || "",
    emergencyPhone: user.emergencyPhone || "",
    emergencyRelation: user.emergencyRelation || "",
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: t("photoUploadError") });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: t("photoSizeError") });
      return;
    }

    setIsUploadingAvatar(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/account/profile/upload-avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const { url } = await response.json();
      setAvatarUrl(url);
      setMessage({ type: "success", text: t("photoUpdatedSuccess") });
      router.refresh();
    } catch (error) {
      console.error("Avatar upload error:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : t("photoUploadFailed"),
      });
    } finally {
      setIsUploadingAvatar(false);
      // Reset the input so the same file can be selected again
      e.target.value = "";
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }

      setMessage({
        type: "success",
        text: t("saved"),
      });

      // Refresh the page data
      router.refresh();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || t("error"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate profile completion (avatar counts as bonus field)
  const totalFields = 11; // 10 form fields + avatar
  const completedFormFields = Object.values(formData).filter(
    (value) => value && value.trim() !== ""
  ).length;
  const avatarCompleted = avatarUrl ? 1 : 0;
  const completedFields = completedFormFields + avatarCompleted;
  const completionPercentage = Math.round(
    (completedFields / totalFields) * 100
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Profile Completion Indicator */}
      <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-900">
            {t("profileCompletion")}
          </span>
          <span className="text-sm font-semibold text-blue-900">
            {completionPercentage}%
          </span>
        </div>
        <div className="w-full h-2 bg-blue-200 rounded-full">
          <div
            className="h-2 transition-all duration-300 bg-blue-600 rounded-full"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-blue-700">{t("completionHelp")}</p>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile Photo */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {t("profilePhoto")}
        </h2>
        <div className="flex items-center gap-6">
          {/* Avatar Preview */}
          <div className="relative">
            <div className="w-24 h-24 overflow-hidden border-2 border-gray-200 rounded-full bg-gray-100">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Profile photo"
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-2xl font-semibold text-gray-400">
                  {formData.name?.[0]?.toUpperCase() ||
                    user.email[0].toUpperCase()}
                </div>
              )}
            </div>
            {isUploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Upload Button */}
          <div className="flex-1">
            <label
              htmlFor="avatar-upload"
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${
                isUploadingAvatar ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Camera className="w-4 h-4" />
              {avatarUrl ? t("changePhoto") : t("uploadPhoto")}
            </label>
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={isUploadingAvatar}
              className="hidden"
            />
            <p className="mt-2 text-xs text-gray-500">
              {t("photoRecommendation")}
            </p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {t("personalInfo")}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="name"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              {t("fullName")}
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              {t("email")}
            </label>
            <input
              type="email"
              id="email"
              value={user.email}
              disabled
              className="w-full px-3 py-2 text-gray-500 border border-gray-300 rounded-md cursor-not-allowed bg-gray-50"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t("emailCannotChange")}
            </p>
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="phone"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              {t("phone")}
            </label>
            <PhoneInput
              value={formData.phone}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, phone: value }))
              }
              placeholder="12 345 6789"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {t("address")}
        </h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label
              htmlFor="streetAddress"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              {t("streetAddress")}
            </label>
            <input
              type="text"
              id="streetAddress"
              name="streetAddress"
              value={formData.streetAddress}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="city"
                className="block mb-1 text-sm font-medium text-gray-700"
              >
                {t("city")}
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="state"
                className="block mb-1 text-sm font-medium text-gray-700"
              >
                {t("state")}
              </label>
              <select
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
              >
                <option value="">{t("selectState")}</option>
                <option value="Johor">Johor</option>
                <option value="Kedah">Kedah</option>
                <option value="Kelantan">Kelantan</option>
                <option value="Melaka">Melaka</option>
                <option value="Negeri Sembilan">Negeri Sembilan</option>
                <option value="Pahang">Pahang</option>
                <option value="Penang">Penang</option>
                <option value="Perak">Perak</option>
                <option value="Perlis">Perlis</option>
                <option value="Sabah">Sabah</option>
                <option value="Sarawak">Sarawak</option>
                <option value="Selangor">Selangor</option>
                <option value="Terengganu">Terengganu</option>
                <option value="Kuala Lumpur">Kuala Lumpur</option>
                <option value="Labuan">Labuan</option>
                <option value="Putrajaya">Putrajaya</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="postcode"
                className="block mb-1 text-sm font-medium text-gray-700"
              >
                {t("postcode")}
              </label>
              <input
                type="text"
                id="postcode"
                name="postcode"
                value={formData.postcode}
                onChange={handleChange}
                maxLength={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="country"
                className="block mb-1 text-sm font-medium text-gray-700"
              >
                {t("country")}
              </label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          {t("emergencyContact")}
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          {t("emergencyContactOptional")}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="emergencyName"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              {t("emergencyContactName")}
            </label>
            <input
              type="text"
              id="emergencyName"
              name="emergencyName"
              value={formData.emergencyName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="emergencyPhone"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              {t("emergencyContactPhone")}
            </label>
            <PhoneInput
              value={formData.emergencyPhone}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, emergencyPhone: value }))
              }
              placeholder="12 345 6789"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="emergencyRelation"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              {t("emergencyContactRelation")}
            </label>
            <RelationshipSelect
              value={formData.emergencyRelation}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, emergencyRelation: value }))
              }
            />
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-sm text-gray-600">
          🔒 <strong>{t("privacyAssurance")}:</strong> {t("privacyMessage")}
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end mb-30">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-[#ec2227] hover:bg-[#d11f24] disabled:opacity-50 text-white"
        >
          {isLoading ? t("saving") : t("saveChanges")}
        </Button>
      </div>
    </form>
  );
}
