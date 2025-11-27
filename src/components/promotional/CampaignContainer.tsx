import { authOptions } from "@/lib/auth/auth-options";
import type { CampaignContext } from "@/lib/services/campaign-service";
import { campaignService } from "@/lib/services/campaign-service";
import type { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { cookies, headers } from "next/headers";
import { PromotionalBanner } from "./PromotionalBanner";

interface CampaignContainerProps {
  placementKey: string;
  /** Page where the campaign is displayed (auto-detected if not provided) */
  currentPage?: string;
  /** Device type (auto-detected if not provided) */
  device?: "DESKTOP" | "MOBILE" | "TABLET";
  /** Locale for content (defaults to 'en') */
  locale?: string;
  /** Optional variant override */
  variant?: "card" | "bar" | "modal";
  /** Optional charter ID for context */
  charterId?: string;
  /** Maximum number of campaigns to show (default: 1 for most, 3 for sidebars) */
  maxCampaigns?: number;
}

/**
 * Placements that support multiple stacked banners
 */
const MULTI_BANNER_PLACEMENTS = ["search-sidebar", "charter-detail-sidebar"];

/**
 * Detect device type from user agent
 */
function detectDevice(userAgent: string): "DESKTOP" | "MOBILE" | "TABLET" {
  const ua = userAgent.toLowerCase();
  if (/mobile/i.test(ua) && !/tablet/i.test(ua)) {
    return "MOBILE";
  }
  if (/tablet|ipad/i.test(ua)) {
    return "TABLET";
  }
  return "DESKTOP";
}

/**
 * Extract page name from pathname
 */
function extractPageName(pathname: string): string {
  // Remove locale prefix (e.g., /en/, /my/)
  const withoutLocale = pathname.replace(/^\/(en|my)\//, "/");

  // Map paths to page names
  if (withoutLocale === "/" || withoutLocale.startsWith("/home")) return "home";
  if (withoutLocale.startsWith("/search")) return "search";
  if (withoutLocale.startsWith("/charters/")) return "charter-detail";
  if (withoutLocale.startsWith("/book")) return "book";
  if (withoutLocale.startsWith("/account")) return "account";

  return "other";
}

/**
 * Server component that fetches and displays active campaigns
 *
 * Sidebar placements (search-sidebar, charter-detail-sidebar) support
 * multiple stacked banners (up to 3 by default).
 *
 * @example
 * // In search page (server component)
 * <CampaignContainer
 *   placementKey="search-sidebar"
 *   currentPage="search"
 *   device="DESKTOP"
 *   locale={params.locale}
 * />
 *
 * // Or with auto-detection
 * <CampaignContainer placementKey="global-bottom-bar" variant="bar" />
 */
export async function CampaignContainer({
  placementKey,
  currentPage,
  device,
  locale,
  variant: variantOverride,
  charterId,
  maxCampaigns,
}: CampaignContainerProps) {
  try {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();
    const headersList = await headers();

    // Auto-detect device from user agent if not provided
    const userAgent = headersList.get("user-agent") || "";
    const detectedDevice = device || detectDevice(userAgent);

    // Auto-detect page from referer/pathname if not provided
    const pathname =
      headersList.get("x-pathname") || headersList.get("referer") || "";
    const detectedPage = currentPage || extractPageName(pathname);

    // Default locale
    const detectedLocale = locale || "en";

    // Get or create session ID
    let sessionId = cookieStore.get("fishon_session_id")?.value;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      // Note: Can't set cookies in server components, will be set by API route
    }

    // Build context for campaign filtering
    const context: CampaignContext = {
      userId: session?.user?.id,
      sessionId: sessionId || crypto.randomUUID(),
      userRole: session?.user?.role as UserRole | undefined,
      currentPage: detectedPage,
      device: detectedDevice,
      locale: detectedLocale,
    };

    // Fetch active campaigns
    const campaigns = await campaignService.getActiveCampaigns(context);

    console.log("[CampaignContainer] Loaded campaigns:", {
      placementKey,
      totalCampaigns: campaigns.length,
      campaignCodes: campaigns.map((c) => c.code),
    });

    // Determine how many campaigns to show
    const isMultiBanner = MULTI_BANNER_PLACEMENTS.includes(placementKey);
    const limit = maxCampaigns ?? (isMultiBanner ? 3 : 1);

    // Find ALL campaigns for this placement (not just the first one)
    const matchingCampaigns = campaigns
      .filter((c) => c.placements.some((p) => p.placementKey === placementKey))
      .slice(0, limit);

    if (matchingCampaigns.length === 0) {
      return null; // No campaigns to show
    }

    // Default CTA href (used when content.ctaHref is not set)
    const defaultCtaHref = `/${detectedLocale}/register`;

    // Render single banner for non-multi placements
    if (matchingCampaigns.length === 1) {
      const campaign = matchingCampaigns[0];
      const placement = campaign.placements.find(
        (p) => p.placementKey === placementKey
      );
      if (!placement) return null;

      const content = campaignService.getCampaignContent(
        campaign,
        detectedLocale
      );
      const layoutConfig = placement.layoutConfig as any;
      const variant =
        variantOverride || layoutConfig.variant?.toLowerCase() || "card";

      // Use custom ctaHref from content, or default to register page
      const ctaHref = content.ctaHref || defaultCtaHref;

      return (
        <PromotionalBanner
          campaignId={campaign.id}
          placementKey={placementKey}
          content={content}
          variant={variant}
          dismissible={true}
          ctaHref={ctaHref}
          className={layoutConfig.className || ""}
        />
      );
    }

    // Render multiple banners stacked for sidebar placements
    return (
      <div className="flex flex-col gap-4">
        {matchingCampaigns.map((campaign) => {
          const placement = campaign.placements.find(
            (p) => p.placementKey === placementKey
          );
          if (!placement) return null;

          const content = campaignService.getCampaignContent(
            campaign,
            detectedLocale
          );
          const layoutConfig = placement.layoutConfig as any;
          const variant =
            variantOverride || layoutConfig.variant?.toLowerCase() || "card";

          // Use custom ctaHref from content, or default to register page
          const ctaHref = content.ctaHref || defaultCtaHref;

          return (
            <PromotionalBanner
              key={campaign.id}
              campaignId={campaign.id}
              placementKey={placementKey}
              content={content}
              variant={variant}
              dismissible={true}
              ctaHref={ctaHref}
              className={layoutConfig.className || ""}
            />
          );
        })}
      </div>
    );
  } catch (error) {
    console.error("[CampaignContainer] Failed to load campaign:", error);
    return null; // Fail gracefully
  }
}
