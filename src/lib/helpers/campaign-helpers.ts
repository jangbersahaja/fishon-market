import type { CampaignWithPlacements } from "@/lib/services/campaign-service";

/**
 * Get device type from window width
 */
export function getDeviceType(): "DESKTOP" | "MOBILE" | "TABLET" {
  if (typeof window === "undefined") return "DESKTOP";

  const width = window.innerWidth;

  if (width < 768) return "MOBILE";
  if (width < 1024) return "TABLET";
  return "DESKTOP";
}

/**
 * Get current page identifier for campaign targeting
 */
export function getCurrentPage(): string {
  if (typeof window === "undefined") return "";

  const pathname = window.location.pathname;

  // Map routes to page identifiers
  if (pathname === "/") return "home";
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/charters/")) return "charter-detail";
  if (pathname.startsWith("/book/")) return "checkout";
  if (pathname.startsWith("/account")) return "account";

  return "other";
}

/**
 * Filter campaigns by placement key
 */
export function getCampaignForPlacement(
  campaigns: CampaignWithPlacements[],
  placementKey: string
): CampaignWithPlacements | null {
  return (
    campaigns.find((campaign) =>
      campaign.placements.some((p) => p.placementKey === placementKey)
    ) || null
  );
}

/**
 * Check if campaign should be shown based on display rules
 */
export function shouldShowCampaign(
  campaign: CampaignWithPlacements,
  placementKey: string
): boolean {
  const placement = campaign.placements.find(
    (p) => p.placementKey === placementKey
  );
  if (!placement) return false;

  const rules = placement.displayRules as any;

  // Check scroll position if required
  if (rules.showAfterScroll && typeof window !== "undefined") {
    if (window.scrollY < rules.showAfterScroll) {
      return false;
    }
  }

  // Add more display rule checks here as needed

  return true;
}

/**
 * Get layout configuration for placement
 */
export function getLayoutConfig(
  campaign: CampaignWithPlacements,
  placementKey: string
): Record<string, any> {
  const placement = campaign.placements.find(
    (p) => p.placementKey === placementKey
  );
  return (placement?.layoutConfig as Record<string, any>) || {};
}

/**
 * Generate session ID for tracking (stored in sessionStorage)
 */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";

  const key = "fishon_campaign_session";
  let sessionId = sessionStorage.getItem(key);

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(key, sessionId);
  }

  return sessionId;
}
