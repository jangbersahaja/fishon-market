"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ProfileFormProps {
  user: {
    name: string | null;
    email: string;
    phone: string | null;
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
  const [isLoading, setIsLoading] = useState(false);
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
        text: "Profile updated successfully!",
      });

      // Refresh the page data
      router.refresh();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Failed to update profile",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate profile completion
  const totalFields = 10;
  const completedFields = Object.values(formData).filter(
    (value) => value && value.trim() !== ""
  ).length;
  const completionPercentage = Math.round(
    (completedFields / totalFields) * 100
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Profile Completion Indicator */}
      <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-900">
            Profile Completion
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
        <p className="mt-2 text-xs text-blue-700">
          A complete profile helps captains verify your booking and prepare for
          your trip.
        </p>
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

      {/* Personal Information */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Personal Information
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="name"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              Full Name
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
              Email
            </label>
            <input
              type="email"
              id="email"
              value={user.email}
              disabled
              className="w-full px-3 py-2 text-gray-500 border border-gray-300 rounded-md cursor-not-allowed bg-gray-50"
            />
            <p className="mt-1 text-xs text-gray-500">
              Email cannot be changed
            </p>
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="phone"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+60123456789"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Include country code (e.g., +60 for Malaysia)
            </p>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Address</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label
              htmlFor="streetAddress"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              Street Address
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
                City
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
                State
              </label>
              <select
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
              >
                <option value="">Select State</option>
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
                Postcode
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
                Country
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
          Emergency Contact
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Optional, but recommended for safety during your fishing trips.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="emergencyName"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              Contact Name
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
              Contact Phone
            </label>
            <input
              type="tel"
              id="emergencyPhone"
              name="emergencyPhone"
              value={formData.emergencyPhone}
              onChange={handleChange}
              placeholder="+60123456789"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="emergencyRelation"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              Relationship
            </label>
            <input
              type="text"
              id="emergencyRelation"
              name="emergencyRelation"
              value={formData.emergencyRelation}
              onChange={handleChange}
              placeholder="e.g., Spouse, Parent, Sibling"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-sm text-gray-600">
          🔒 <strong>Privacy Assurance:</strong> Your personal information is
          only shared with captains after you complete a booking payment. We
          never sell your data to third parties.
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end mb-30">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-[#ec2227] hover:bg-[#d11f24] disabled:opacity-50 text-white"
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
