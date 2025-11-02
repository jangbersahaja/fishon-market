"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import ReviewForm from "./ReviewForm";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  charterName: string;
  tripDate: Date;
  location: string;
}

export default function ReviewModal({
  isOpen,
  onClose,
  bookingId,
  charterName,
  tripDate,
  location,
}: ReviewModalProps) {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleSubmitSuccess = () => {
    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
      onClose();
    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
          aria-label="Close modal"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Content */}
        <div className="p-6">
          {showSuccessMessage ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
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
              </div>
              <h3 className="text-xl font-semibold mb-2">Review Submitted!</h3>
              <p className="text-gray-600">
                Thank you for your feedback. Your review will be published after
                admin approval.
              </p>
            </div>
          ) : (
            <ReviewForm
              bookingId={bookingId}
              charterName={charterName}
              tripDate={tripDate}
              location={location}
              onSubmit={handleSubmitSuccess}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
