"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Gift, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export interface CampaignContent {
  title: string;
  subtitle: string;
  cta: string;
  benefits?: string[];
  imageUrl?: string;
}

export interface PromotionalBannerProps {
  campaignId: string;
  placementKey: string;
  content: CampaignContent;
  variant: "card" | "bar" | "modal";
  dismissible?: boolean;
  ctaHref: string;
  className?: string;
  onImpression?: () => void;
  onClick?: () => void;
  onDismiss?: () => void;
}

/**
 * Main promotional banner component with tracking and variant support
 */
export function PromotionalBanner({
  campaignId,
  placementKey,
  content,
  variant,
  dismissible = true,
  ctaHref,
  className = "",
  onImpression,
  onClick,
  onDismiss,
}: PromotionalBannerProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const [tracked, setTracked] = useState(false);

  // Track impression on mount
  useEffect(() => {
    if (!tracked && visible) {
      trackImpression();
      setTracked(true);
    }
  }, [visible, tracked]);

  const trackImpression = async () => {
    try {
      await fetch("/api/campaigns/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          placementKey,
          action: "IMPRESSION",
        }),
      });
      onImpression?.();
    } catch (error) {
      console.error("[PromotionalBanner] Failed to track impression:", error);
    }
  };

  const handleClick = async () => {
    try {
      await fetch("/api/campaigns/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          placementKey,
          action: "CLICK",
        }),
      });
      onClick?.();
      router.push(ctaHref);
    } catch (error) {
      console.error("[PromotionalBanner] Failed to track click:", error);
      router.push(ctaHref);
    }
  };

  const handleDismiss = async () => {
    try {
      await fetch("/api/campaigns/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          placementKey,
          action: "DISMISS",
        }),
      });
      onDismiss?.();
      setVisible(false);
    } catch (error) {
      console.error("[PromotionalBanner] Failed to track dismissal:", error);
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "promotional-banner",
        `promotional-banner--${variant}`,
        className
      )}
    >
      {variant === "card" && (
        <CardVariant
          content={content}
          onCTAClick={handleClick}
          onDismiss={dismissible ? handleDismiss : undefined}
        />
      )}

      {variant === "bar" && (
        <BarVariant
          content={content}
          onCTAClick={handleClick}
          onDismiss={dismissible ? handleDismiss : undefined}
        />
      )}

      {variant === "modal" && (
        <ModalVariant
          content={content}
          onCTAClick={handleClick}
          onDismiss={dismissible ? handleDismiss : undefined}
        />
      )}
    </div>
  );
}

/**
 * Card variant - for sidebar placements (desktop)
 */
function CardVariant({
  content,
  onCTAClick,
  onDismiss,
}: {
  content: CampaignContent;
  onCTAClick: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className="relative bg-white dark:bg-gray-900 rounded-lg border border-[#ec2227]/20 p-5 shadow-lg animate-in fade-in slide-in-from-right-5 duration-500">
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-[#ec2227] transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="mb-4">
        <Badge
          variant="secondary"
          className="mb-2 bg-[#ec2227] text-white hover:bg-[#d11f24]"
        >
          New Member Offer
        </Badge>
        <h3 className="mb-2 text-xl font-semibold text-gray-900 uppercase dark:text-white font-oswald">
          {content.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {content.subtitle}
        </p>
      </div>

      {content.benefits && content.benefits.length > 0 && (
        <ul className="mb-6 space-y-2">
          {content.benefits.map((benefit, idx) => (
            <li
              key={idx}
              className="flex items-start text-sm text-gray-700 dark:text-gray-300"
            >
              <span className="text-[#ec2227] mr-2 flex-shrink-0">✓</span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      )}

      <Button
        onClick={onCTAClick}
        className="w-full bg-[#ec2227] hover:bg-[#d11f24] text-white"
        size="lg"
      >
        {content.cta}
      </Button>
    </div>
  );
}

/**
 * Bar variant - for mobile bottom placements
 */
function BarVariant({
  content,
  onCTAClick,
  onDismiss,
}: {
  content: CampaignContent;
  onCTAClick: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-[#ec2227]/20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 animate-in slide-in-from-bottom duration-500">
      <div className="container flex items-center justify-between gap-4 mx-auto">
        <div className="flex items-center flex-1 min-w-0 gap-3">
          <div className="shrink-0 w-10 h-10 bg-[#ec2227]/10 rounded-full flex items-center justify-center">
            <Gift className="h-5 w-5 text-[#ec2227]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate dark:text-white">
              {content.title}
            </p>
            <p className="text-xs text-gray-600 truncate dark:text-gray-400">
              {content.subtitle}
            </p>
          </div>
        </div>

        <Button
          onClick={onCTAClick}
          size="sm"
          className="shrink-0 bg-[#ec2227] hover:bg-[#d11f24] text-white"
        >
          {content.cta}
        </Button>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 text-gray-400 hover:text-[#ec2227] transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Modal variant - for interstitial placements
 */
function ModalVariant({
  content,
  onCTAClick,
  onDismiss,
}: {
  content: CampaignContent;
  onCTAClick: () => void;
  onDismiss?: () => void;
}) {
  const [countdown, setCountdown] = useState(3);
  const [canDismiss, setCanDismiss] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanDismiss(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && canDismiss && onDismiss) {
        onDismiss();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [canDismiss, onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-300 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="bg-gradient-to-tr from-[#ec2227] via-[#d11f24] to-[#b01a1f] rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-300 text-white border border-white/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {onDismiss && canDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 z-10 bg-black/20 hover:bg-black/40 text-white rounded-full p-1.5 transition-colors backdrop-blur-sm"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="mb-6 text-center">
          {content.imageUrl ? (
            <div className="relative w-full h-48 mx-auto mb-5 overflow-hidden rounded-lg shadow-md bg-white/5">
              <Image
                src={content.imageUrl}
                alt={content.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 backdrop-blur-sm">
              <span className="text-3xl">🎣</span>
            </div>
          )}
          <h2
            id="modal-title"
            className="mb-2 text-2xl font-semibold text-white uppercase font-oswald drop-shadow-sm"
          >
            {content.title}
          </h2>
          <p className="font-medium text-white/90">{content.subtitle}</p>
        </div>

        {content.benefits && content.benefits.length > 0 && (
          <div className="p-4 mb-6 space-y-3 rounded-lg bg-black/10">
            {content.benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-center text-sm text-white">
                <span className="bg-white text-[#ec2227] rounded-full w-5 h-5 flex items-center justify-center mr-3 text-xs font-bold flex-shrink-0">
                  ✓
                </span>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={onCTAClick}
            className="w-full bg-white text-[#ec2227] hover:bg-gray-50 font-bold shadow-lg border-0"
            size="lg"
          >
            {content.cta}
          </Button>

          {onDismiss && (
            <Button
              onClick={onDismiss}
              variant="ghost"
              className="w-full text-white hover:bg-white/10 hover:text-white"
              disabled={!canDismiss}
            >
              {canDismiss ? "Maybe Later" : `Wait ${countdown}s...`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
