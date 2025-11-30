import { prisma } from "@/lib/database/prisma";
import type {
  CampaignPlacement,
  PromotionalCampaign,
  UserRole,
} from "@prisma/client";

export interface CampaignContext {
  userId?: string;
  sessionId: string;
  userRole?: UserRole;
  currentPage: string;
  device: "DESKTOP" | "MOBILE" | "TABLET";
  locale: string;
}

export interface CampaignWithPlacements extends PromotionalCampaign {
  placements: CampaignPlacement[];
}

export interface CampaignContent {
  title: string;
  subtitle: string;
  cta: string;
  ctaHref?: string; // Custom CTA link (defaults to /register if not provided)
  benefits?: string[];
}

export class CampaignService {
  /**
   * Get active campaigns for current context
   */
  async getActiveCampaigns(
    context: CampaignContext
  ): Promise<CampaignWithPlacements[]> {
    const now = new Date();

    // Build targeting filters
    const targetingFilter = {
      status: "ACTIVE" as const,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
      allowedPages: { has: context.currentPage },
      allowedDevices: { has: context.device },
    };

    // Add user type filter
    const userTypeFilter = context.userId
      ? { targetRegistered: true }
      : { targetGuests: true };

    // Add role exclusion filter
    const roleFilter =
      context.userRole && context.userId
        ? { NOT: { excludeRoles: { has: context.userRole } } }
        : {};

    const campaigns = await prisma.promotionalCampaign.findMany({
      where: {
        ...targetingFilter,
        ...userTypeFilter,
        ...roleFilter,
      },
      include: {
        placements: {
          where: {
            devices: { has: context.device },
          },
        },
      },
      orderBy: { priority: "desc" },
    });

    // Filter out dismissed campaigns based on their dismissal strategy
    const filteredCampaigns = await this.filterDismissedCampaigns(
      campaigns,
      context
    );

    return filteredCampaigns;
  }

  /**
   * Check if campaign should be shown based on dismissal rules
   */
  async filterDismissedCampaigns(
    campaigns: CampaignWithPlacements[],
    context: CampaignContext
  ): Promise<CampaignWithPlacements[]> {
    // Get all dismissals for this session
    const interactions = await prisma.userCampaignInteraction.findMany({
      where: {
        sessionId: context.sessionId,
        action: "DISMISS",
        campaignId: { in: campaigns.map((c) => c.id) },
      },
      orderBy: { createdAt: "desc" },
    });

    return campaigns.filter((campaign) => {
      const dismissals = interactions.filter(
        (i) => i.campaignId === campaign.id
      );

      if (dismissals.length === 0) {
        return true; // Never dismissed, show it
      }

      switch (campaign.dismissalStrategy) {
        case "SESSION_ONLY":
          // If dismissed in this session, don't show
          return false;

        case "PERMANENT":
          // If ever dismissed, never show again
          return false;

        case "SESSION_WITH_COOLDOWN": {
          const lastDismissal = dismissals[0];
          if (!lastDismissal) return true;

          const cooldownEnd = new Date(lastDismissal.createdAt);
          cooldownEnd.setDate(
            cooldownEnd.getDate() + (campaign.cooldownDays ?? 3)
          );
          return new Date() > cooldownEnd;
        }

        case "MAX_DISMISSALS":
          return dismissals.length < (campaign.maxDismissals ?? 5);

        default:
          return true;
      }
    });
  }

  /**
   * Get campaign content for current locale
   */
  getCampaignContent(
    campaign: PromotionalCampaign,
    locale: string
  ): CampaignContent {
    const content =
      locale === "ms"
        ? (campaign.contentMy as unknown as CampaignContent)
        : (campaign.contentEn as unknown as CampaignContent);
    return content;
  }

  /**
   * Track campaign impression
   */
  async trackImpression(
    campaignId: string,
    placementKey: string,
    context: CampaignContext
  ): Promise<void> {
    try {
      await prisma.$transaction([
        // Create interaction record
        prisma.userCampaignInteraction.create({
          data: {
            userId: context.userId,
            sessionId: context.sessionId,
            campaignId,
            placementKey,
            action: "IMPRESSION",
            metadata: {
              page: context.currentPage,
              device: context.device,
              locale: context.locale,
              timestamp: new Date().toISOString(),
            },
          },
        }),
        // Increment aggregate counter
        prisma.promotionalCampaign.update({
          where: { id: campaignId },
          data: { impressions: { increment: 1 } },
        }),
      ]);
    } catch (error) {
      console.error("[CampaignService] Failed to track impression:", error);
      // Don't throw - tracking failure shouldn't break UX
    }
  }

  /**
   * Track campaign click
   */
  async trackClick(
    campaignId: string,
    placementKey: string,
    context: CampaignContext
  ): Promise<void> {
    try {
      await prisma.$transaction([
        // Create interaction record
        prisma.userCampaignInteraction.create({
          data: {
            userId: context.userId,
            sessionId: context.sessionId,
            campaignId,
            placementKey,
            action: "CLICK",
            metadata: {
              page: context.currentPage,
              device: context.device,
              locale: context.locale,
              timestamp: new Date().toISOString(),
            },
          },
        }),
        // Increment aggregate counter
        prisma.promotionalCampaign.update({
          where: { id: campaignId },
          data: { clicks: { increment: 1 } },
        }),
      ]);
    } catch (error) {
      console.error("[CampaignService] Failed to track click:", error);
      // Don't throw - tracking failure shouldn't break UX
    }
  }

  /**
   * Track campaign dismissal
   */
  async trackDismissal(
    campaignId: string,
    placementKey: string,
    context: CampaignContext
  ): Promise<void> {
    try {
      await prisma.userCampaignInteraction.create({
        data: {
          userId: context.userId,
          sessionId: context.sessionId,
          campaignId,
          placementKey,
          action: "DISMISS",
          metadata: {
            page: context.currentPage,
            device: context.device,
            locale: context.locale,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error("[CampaignService] Failed to track dismissal:", error);
      // Don't throw - tracking failure shouldn't break UX
    }
  }

  /**
   * Track campaign conversion (user registered after seeing campaign)
   */
  async trackConversion(userId: string, sessionId: string): Promise<void> {
    try {
      // Check if user saw any campaigns in this session within last hour
      const oneHourAgo = new Date(Date.now() - 3600000);

      const impression = await prisma.userCampaignInteraction.findFirst({
        where: {
          sessionId,
          action: "IMPRESSION",
          createdAt: { gte: oneHourAgo },
        },
        orderBy: { createdAt: "desc" },
      });

      if (impression) {
        await prisma.$transaction([
          // Create conversion record
          prisma.userCampaignInteraction.create({
            data: {
              userId,
              sessionId,
              campaignId: impression.campaignId,
              placementKey: impression.placementKey,
              action: "CONVERSION",
              metadata: {
                impressionId: impression.id,
                timeSinceImpression:
                  Date.now() - impression.createdAt.getTime(),
              },
            },
          }),
          // Increment conversion counter
          prisma.promotionalCampaign.update({
            where: { id: impression.campaignId },
            data: { conversions: { increment: 1 } },
          }),
        ]);
      }
    } catch (error) {
      console.error("[CampaignService] Failed to track conversion:", error);
      // Don't throw - tracking failure shouldn't break UX
    }
  }

  /**
   * Get all campaigns (for admin)
   */
  async getAllCampaigns(): Promise<CampaignWithPlacements[]> {
    const campaigns = await prisma.promotionalCampaign.findMany({
      include: {
        placements: true,
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    });

    return campaigns;
  }

  /**
   * Get campaign analytics summary
   */
  async getCampaignAnalytics(campaignId: string) {
    const campaign = await prisma.promotionalCampaign.findUnique({
      where: { id: campaignId },
      include: {
        interactions: {
          select: {
            action: true,
            createdAt: true,
            placementKey: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const clickThroughRate =
      campaign.impressions > 0
        ? (campaign.clicks / campaign.impressions) * 100
        : 0;

    const conversionRate =
      campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0;

    return {
      campaignId: campaign.id,
      code: campaign.code,
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      conversions: campaign.conversions,
      clickThroughRate: Math.round(clickThroughRate * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }
}

export const campaignService = new CampaignService();
