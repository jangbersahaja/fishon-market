"use client";

import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Edit,
  Eye,
  MapPin,
  MessageSquare,
  Phone,
  RotateCcw,
  Star,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

// ============================================================================
// Call Captain Button
// ============================================================================
interface CallCaptainButtonProps {
  phone: string;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  className?: string;
  fullWidth?: boolean;
}

export function CallCaptainButton({
  phone,
  variant = "outline",
  size = "default",
  className = "",
  fullWidth = false,
}: CallCaptainButtonProps) {
  const t = useTranslations("booking.actions");

  return (
    <Button
      variant={variant}
      size={size}
      className={fullWidth ? `w-full ${className}` : className}
      asChild
    >
      <a href={`tel:${phone}`}>
        <Phone className="w-4 h-4 mr-2" />
        {t("callCaptain")}
      </a>
    </Button>
  );
}

// ============================================================================
// Chat with Captain Button
// ============================================================================
interface ChatCaptainButtonProps {
  conversationId?: string | null;
  disabled?: boolean;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  className?: string;
  fullWidth?: boolean;
}

export function ChatCaptainButton({
  conversationId,
  disabled = false,
  variant = "outline",
  size = "default",
  className = "",
  fullWidth = false,
}: ChatCaptainButtonProps) {
  const t = useTranslations("booking.actions");

  return (
    <Button
      variant={variant}
      size={size}
      className={fullWidth ? `w-full ${className}` : className}
      disabled={disabled || !conversationId}
      title={
        disabled || !conversationId
          ? t("chatNotAvailable")
          : t("chatWithCaptain")
      }
      asChild={!disabled && conversationId ? true : false}
    >
      {!disabled && conversationId ? (
        <Link href={`/account/messages/${conversationId}`}>
          <MessageSquare className="w-4 h-4 mr-2" />
          {t("chatCaptain")}
        </Link>
      ) : (
        <>
          <MessageSquare className="w-4 h-4 mr-2" />
          {t("chatCaptain")}
        </>
      )}
    </Button>
  );
}

// ============================================================================
// Navigate to Starting Point Buttons
// ============================================================================
interface NavigateButtonsProps {
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function NavigateButtons({
  location,
  latitude,
  longitude,
  size = "sm",
  className = "",
}: NavigateButtonsProps) {
  const t = useTranslations("booking.actions");

  // Use coordinates if available, otherwise use location text
  const query =
    latitude && longitude
      ? `${latitude},${longitude}`
      : encodeURIComponent(location);
  const wazeLink = `https://waze.com/ul?ll=${query}&navigate=yes`;
  const googleMapsLink =
    latitude && longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button variant="outline" size={size} className="flex-1" asChild>
        <a href={wazeLink} target="_blank" rel="noopener noreferrer">
          <MapPin className="w-4 h-4 mr-1" />
          {t("waze")}
        </a>
      </Button>
      <Button variant="outline" size={size} className="flex-1" asChild>
        <a href={googleMapsLink} target="_blank" rel="noopener noreferrer">
          <MapPin className="w-4 h-4 mr-1" />
          {t("maps")}
        </a>
      </Button>
    </div>
  );
}

// ============================================================================
// Review Buttons (Write/View)
// ============================================================================
interface ReviewButtonProps {
  bookingId: string;
  hasReview?: boolean;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  className?: string;
  fullWidth?: boolean;
}

export function WriteReviewButton({
  bookingId,
  variant = "default",
  size = "lg",
  className = "",
  fullWidth = false,
}: Omit<ReviewButtonProps, "hasReview">) {
  const t = useTranslations("booking.actions");

  return (
    <Button
      variant={variant}
      size={size}
      className={`${
        fullWidth ? "w-full" : ""
      } bg-amber-500 hover:bg-amber-600 text-white ${className}`}
      asChild
    >
      <Link href={`/account/reviews?action=new&bookingId=${bookingId}`}>
        <Edit className="w-4 h-4 mr-2" />
        {t("writeReview")}
      </Link>
    </Button>
  );
}

export function ViewReviewButton({
  bookingId,
  variant = "default",
  size = "lg",
  className = "text-white bg-amber-700 hover:bg-amber-800",
  fullWidth = false,
}: Omit<ReviewButtonProps, "hasReview">) {
  const t = useTranslations("booking.actions");

  return (
    <Button
      variant={variant}
      size={size}
      className={`${fullWidth ? "w-full" : ""} ${className}`}
      asChild
    >
      <Link href={`/account/reviews?bookingId=${bookingId}`}>
        <Eye className="w-4 h-4 mr-2" />
        {t("viewReview")}
      </Link>
    </Button>
  );
}

// ============================================================================
// Pay Now Button
// ============================================================================
interface PayNowButtonProps {
  bookingId: string;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  className?: string;
  fullWidth?: boolean;
}

export function PayNowButton({
  bookingId,
  variant = "default",
  size = "lg",
  className = "",
  fullWidth = false,
}: PayNowButtonProps) {
  const t = useTranslations("booking.actions");

  return (
    <Button
      variant={variant}
      size={size}
      className={`${
        fullWidth ? "w-full" : ""
      } bg-green-600 hover:bg-green-700 text-white ${className}`}
      asChild
    >
      <Link href={`/book/payment/${bookingId}`}>
        <CreditCard className="w-4 h-4 mr-2" />
        {t("payNow")}
      </Link>
    </Button>
  );
}

// ============================================================================
// Cancel Booking Button
// ============================================================================
interface CancelBookingButtonProps {
  bookingId: string;
  variant?: "default" | "outline" | "destructive";
  size?: "default" | "sm" | "lg";
  className?: string;
  fullWidth?: boolean;
  onCancel?: () => void; // Required callback for cancel logic
}

export function CancelBookingButton({
  variant = "default",
  size = "default",
  className = "",
  fullWidth = false,
  onCancel,
}: CancelBookingButtonProps) {
  const t = useTranslations("booking.actions");

  return (
    <Button
      variant={variant}
      size={size}
      className={`${
        fullWidth ? "w-full" : ""
      } bg-red-600 hover:bg-red-700 text-white ${className}`}
      onClick={onCancel}
    >
      <X className="w-4 h-4 mr-2" />
      {t("cancel")}
    </Button>
  );
}

// ============================================================================
// View Details Button
// ============================================================================
interface ViewDetailsButtonProps {
  bookingId: string;
  locale: string;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  className?: string;
  fullWidth?: boolean;
}

export function ViewDetailsButton({
  bookingId,
  locale,
  variant = "default",
  size = "default",
  className = "text-white bg-gray-700 hover:bg-gray-800",
  fullWidth = false,
}: ViewDetailsButtonProps) {
  const t = useTranslations("booking.actions");

  return (
    <Button
      variant={variant}
      size={size}
      className={`${fullWidth ? "w-full" : ""} ${className}`}
      asChild
    >
      <Link href={`/${locale}/book/confirm?id=${bookingId}`}>
        {t("viewDetails")}
      </Link>
    </Button>
  );
}

// ============================================================================
// Rating Display Component
// ============================================================================
interface RatingDisplayProps {
  rating: number; // 1-5
  className?: string;
}

export function RatingDisplay({ rating, className = "" }: RatingDisplayProps) {
  const t = useTranslations("booking.actions");

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-sm font-medium text-gray-700">
        {t("yourRating")}
      </span>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
      <span className="text-sm text-gray-600">({rating}/5)</span>
    </div>
  );
}

// ============================================================================
// Book Again Button
// ============================================================================
interface BookAgainButtonProps {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  className?: string;
  fullWidth?: boolean;
  charterId?: string;
}

export function BookAgainButton({
  variant = "outline",
  size = "default",
  className = "",
  fullWidth = false,
  charterId,
}: BookAgainButtonProps) {
  const t = useTranslations("booking.actions");

  return (
    <Button
      variant={variant}
      size={size}
      className={`${fullWidth ? "w-full" : ""} ${className}`}
      asChild
    >
      <Link href={`/charters/${charterId}`}>
        <RotateCcw className="w-4 h-4 mr-2" />
        {t("bookAgain")}
      </Link>
    </Button>
  );
}
