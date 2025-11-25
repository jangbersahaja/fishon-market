import { authOptions } from "@/lib/auth/auth-options";
import type { CampaignContext } from "@/lib/services/campaign-service";
import { campaignService } from "@/lib/services/campaign-service";
import type { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { PromotionalBanner } from "./PromotionalBanner";

interface CampaignContainerProps {
  placementKey: string;
  currentPage: string;
  device: "DESKTOP" | "MOBILE" | "TABLET";
  locale: string;
}

/**
 * Server component that fetches and displays active campaigns
 *
 * @example
 * // In search page (server component)
 * <CampaignContainer
 *   placementKey="search-sidebar"
 *   currentPage="search"
 *   device="DESKTOP"
 *   locale={params.locale}
 * />
 */
export async function CampaignContainer({
  placementKey,
  currentPage,
  device,
  locale,
}: CampaignContainerProps) {
  try {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();

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
      currentPage,
      device,
      locale,
    };

    // Fetch active campaigns
    const campaigns = await campaignService.getActiveCampaigns(context);

    // Find campaign for this placement
    const campaign = campaigns.find((c) =>
      c.placements.some((p) => p.placementKey === placementKey)
    );

    if (!campaign) {
      return null; // No campaign to show
    }

    // Get placement configuration
    const placement = campaign.placements.find(
      (p) => p.placementKey === placementKey
    );
    if (!placement) {
      return null;
    }

    // Get localized content
    const content = campaignService.getCampaignContent(campaign, locale);

    // Determine variant from layout config
    const layoutConfig = placement.layoutConfig as any;
    const variant = layoutConfig.variant?.toLowerCase() || "card";

    // Determine CTA href (default to register page)
    const ctaHref = `/${locale}/register`;

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
  } catch (error) {
    console.error("[CampaignContainer] Failed to load campaign:", error);
    return null; // Fail gracefully
  }
}
