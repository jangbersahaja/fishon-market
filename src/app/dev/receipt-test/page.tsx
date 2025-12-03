"use client";

import { useState } from "react";

export default function ReceiptTestPage() {
  const [locale, setLocale] = useState<"en" | "ms">("en");
  const [withDiscount, setWithDiscount] = useState(false);
  const [withEmergencyContact, setWithEmergencyContact] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dev/receipt-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          withDiscount,
          withEmergencyContact,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate receipt");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Sample-Receipt-${locale.toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          📄 Receipt PDF Test
        </h1>
        <p className="text-gray-600 mb-6">
          Test the multi-language booking confirmation PDF generator.
        </p>

        {/* Language Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Language / Bahasa
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setLocale("en")}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                locale === "en"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              🇬🇧 English
            </button>
            <button
              onClick={() => setLocale("ms")}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                locale === "ms"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              🇲🇾 Bahasa Melayu
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="mb-6 space-y-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Options
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={withDiscount}
              onChange={(e) => setWithDiscount(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">
              Include discount (10% off with promo code)
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={withEmergencyContact}
              onChange={(e) => setWithEmergencyContact(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">Include emergency contact</span>
          </label>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-[#ec2227] text-white font-semibold rounded-lg hover:bg-[#d11f24] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
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
              Generating PDF...
            </>
          ) : (
            <>
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
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download Sample PDF
            </>
          )}
        </button>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            ❌ {error}
          </div>
        )}

        {/* Preview Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Sample Data:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Charter: Sunrise Fishing Charter</li>
            <li>• Trip: Full Day Deep Sea Fishing</li>
            <li>• Location: Kuala Terengganu</li>
            <li>• Guests: 4 Adults, 1 Child</li>
            <li>
              • Price: RM 1,500 {withDiscount && "(RM 1,350 with discount)"}
            </li>
            <li>• Captain: Kapten Ahmad (15 yrs exp)</li>
            <li>• Boat: Sea Hunter II (32ft Sport Fishing)</li>
            <li>• Includes: Rods, Bait, Ice Box, Life Jackets...</li>
          </ul>
        </div>

        {/* Layout Info */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h3 className="font-medium text-blue-900 mb-2">
            📐 New Layout Features:
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>✓ Two-column layout (matches desktop view)</li>
            <li>✓ Charter image placeholder</li>
            <li>✓ Captain & boat info cards</li>
            <li>✓ Amenities badges</li>
            <li>✓ PAID stamp on pricing</li>
            <li>✓ Participants list with booker badge</li>
            <li>✓ Emergency contact (yellow box)</li>
          </ul>
        </div>

        {/* Dev Note */}
        <p className="mt-6 text-xs text-gray-400 text-center">
          ⚠️ This page is only available in development mode
        </p>
      </div>
    </div>
  );
}
