"use client";

import {
  PromotionalBanner,
  type CampaignContent,
} from "@/components/promotional/PromotionalBanner";
import { useEffect, useState } from "react";

interface HomeWelcomeModalProps {
  campaignId: string | null;
  placementKey: string;
  content: CampaignContent | null;
  variant: "card" | "bar" | "modal";
  ctaHref: string;
  className?: string;
}

/**
 * Homepage welcome modal that shows after engagement:
 * - Shows after 15 seconds (time-delayed)
 * - Modal format with backdrop
 * - Easy to dismiss
 * - Doesn't interrupt user immediately on page load
 *
 * Note: Time-delayed to allow user to see homepage value first
 * before showing promotional content.
 *
 * @see docs/implementation/PHASE_4_HOMEPAGE_WELCOME.md
 */
export function HomeWelcomeModal({
  campaignId,
  placementKey,
  content,
  variant,
  ctaHref,
  className = "",
}: HomeWelcomeModalProps) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Show modal after 5 seconds
    const timeoutId: NodeJS.Timeout = setTimeout(() => {
      setShowModal(true);
    }, 5000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  const handleDismiss = () => {
    setShowModal(false);
  };

  if (!showModal || !campaignId || !content) return null;

  return (
    <PromotionalBanner
      campaignId={campaignId}
      placementKey={placementKey}
      content={content}
      variant={variant}
      dismissible={true}
      ctaHref={ctaHref}
      className={className}
      onDismiss={handleDismiss}
    />
  );
}
