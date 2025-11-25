"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import type {
  CampaignStatus,
  CampaignType,
  DismissalStrategy,
  PlacementPosition,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface CampaignContent {
  title: string;
  subtitle: string;
  cta: string;
  benefits?: string[];
  imageUrl?: string;
}

export interface PlacementFormData {
  placementKey: string;
  devices: string[];
  position: PlacementPosition;
  sticky?: boolean;
  displayRules?: any;
  layoutConfig?: any;
}

export interface CampaignFormData {
  code: string;
  type: CampaignType;
  status: CampaignStatus;
  priority: number;
  startDate: Date | null;
  endDate: Date | null;
  targetGuests: boolean;
  targetRegistered: boolean;
  excludeRoles: string[];
  allowedPages: string[];
  allowedDevices: string[];
  contentEn: CampaignContent;
  contentMy: CampaignContent;
  dismissalStrategy: DismissalStrategy;
  cooldownDays: number | null;
  maxDismissals: number | null;
  placements: PlacementFormData[];
}

/**
 * Check if user has admin/staff permissions
 */
async function requireAdminAccess() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session?.user?.id || !["ADMIN", "STAFF"].includes(userRole)) {
    throw new Error("Unauthorized: Admin access required");
  }

  return session.user.id;
}

/**
 * Create a new promotional campaign
 */
export async function createCampaign(data: CampaignFormData) {
  try {
    const userId = await requireAdminAccess();

    // Validate required fields
    if (!data.code || !data.type || !data.status) {
      return {
        success: false,
        error: "Missing required fields: code, type, or status",
      };
    }

    if (
      !data.contentEn.title ||
      !data.contentEn.subtitle ||
      !data.contentEn.cta
    ) {
      return {
        success: false,
        error: "English content is incomplete",
      };
    }

    if (
      !data.contentMy.title ||
      !data.contentMy.subtitle ||
      !data.contentMy.cta
    ) {
      return {
        success: false,
        error: "Malay content is incomplete",
      };
    }

    if (data.allowedPages.length === 0 || data.allowedDevices.length === 0) {
      return {
        success: false,
        error: "At least one page and one device must be selected",
      };
    }

    // Check if code already exists
    const existing = await prisma.promotionalCampaign.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      return {
        success: false,
        error: `Campaign with code "${data.code}" already exists`,
      };
    }

    // Create campaign with placements
    const campaign = await prisma.promotionalCampaign.create({
      data: {
        code: data.code,
        type: data.type,
        status: data.status,
        priority: data.priority,
        startDate: data.startDate,
        endDate: data.endDate,
        targetGuests: data.targetGuests,
        targetRegistered: data.targetRegistered,
        excludeRoles: data.excludeRoles as any,
        allowedPages: data.allowedPages,
        allowedDevices: data.allowedDevices,
        contentEn: data.contentEn as any,
        contentMy: data.contentMy as any,
        dismissalStrategy: data.dismissalStrategy,
        cooldownDays: data.cooldownDays,
        maxDismissals: data.maxDismissals,
        createdBy: userId,
        placements: {
          create: data.placements.map((placement) => ({
            placementKey: placement.placementKey,
            devices: placement.devices,
            position: placement.position,
            sticky: placement.sticky || false,
            displayRules: placement.displayRules || {},
            layoutConfig: placement.layoutConfig || {},
          })),
        },
      },
      include: {
        placements: true,
      },
    });

    revalidatePath("/admin/campaigns");

    return {
      success: true,
      campaignId: campaign.id,
    };
  } catch (error) {
    console.error("[createCampaign] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create campaign",
    };
  }
}

/**
 * Update an existing promotional campaign
 */
export async function updateCampaign(
  campaignId: string,
  data: CampaignFormData
) {
  try {
    await requireAdminAccess();

    // Validate required fields
    if (!data.code || !data.type || !data.status) {
      return {
        success: false,
        error: "Missing required fields: code, type, or status",
      };
    }

    if (
      !data.contentEn.title ||
      !data.contentEn.subtitle ||
      !data.contentEn.cta
    ) {
      return {
        success: false,
        error: "English content is incomplete",
      };
    }

    if (
      !data.contentMy.title ||
      !data.contentMy.subtitle ||
      !data.contentMy.cta
    ) {
      return {
        success: false,
        error: "Malay content is incomplete",
      };
    }

    if (data.allowedPages.length === 0 || data.allowedDevices.length === 0) {
      return {
        success: false,
        error: "At least one page and one device must be selected",
      };
    }

    // Check if campaign exists
    const existing = await prisma.promotionalCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!existing) {
      return {
        success: false,
        error: "Campaign not found",
      };
    }

    // Check if code conflicts with another campaign
    if (data.code !== existing.code) {
      const codeConflict = await prisma.promotionalCampaign.findUnique({
        where: { code: data.code },
      });

      if (codeConflict) {
        return {
          success: false,
          error: `Campaign with code "${data.code}" already exists`,
        };
      }
    }

    // Update campaign
    await prisma.$transaction(async (tx) => {
      // Update main campaign
      await tx.promotionalCampaign.update({
        where: { id: campaignId },
        data: {
          code: data.code,
          type: data.type,
          status: data.status,
          priority: data.priority,
          startDate: data.startDate,
          endDate: data.endDate,
          targetGuests: data.targetGuests,
          targetRegistered: data.targetRegistered,
          excludeRoles: data.excludeRoles as any,
          allowedPages: data.allowedPages,
          allowedDevices: data.allowedDevices,
          contentEn: data.contentEn as any,
          contentMy: data.contentMy as any,
          dismissalStrategy: data.dismissalStrategy,
          cooldownDays: data.cooldownDays,
          maxDismissals: data.maxDismissals,
        },
      });

      // Delete existing placements
      await tx.campaignPlacement.deleteMany({
        where: { campaignId },
      });

      // Create new placements
      if (data.placements.length > 0) {
        await tx.campaignPlacement.createMany({
          data: data.placements.map((placement) => ({
            campaignId,
            placementKey: placement.placementKey,
            devices: placement.devices,
            position: placement.position,
            sticky: placement.sticky || false,
            displayRules: placement.displayRules || {},
            layoutConfig: placement.layoutConfig || {},
          })),
        });
      }
    });

    revalidatePath("/admin/campaigns");
    revalidatePath(`/admin/campaigns/${campaignId}/edit`);

    return {
      success: true,
      campaignId,
    };
  } catch (error) {
    console.error("[updateCampaign] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update campaign",
    };
  }
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(campaignId: string) {
  try {
    await requireAdminAccess();

    await prisma.promotionalCampaign.delete({
      where: { id: campaignId },
    });

    revalidatePath("/admin/campaigns");

    return {
      success: true,
    };
  } catch (error) {
    console.error("[deleteCampaign] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete campaign",
    };
  }
}

/**
 * Get campaign by ID for editing
 */
export async function getCampaignForEdit(campaignId: string) {
  try {
    await requireAdminAccess();

    const campaign = await prisma.promotionalCampaign.findUnique({
      where: { id: campaignId },
      include: {
        placements: true,
      },
    });

    if (!campaign) {
      return {
        success: false,
        error: "Campaign not found",
      };
    }

    return {
      success: true,
      campaign,
    };
  } catch (error) {
    console.error("[getCampaignForEdit] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch campaign data",
    };
  }
}
