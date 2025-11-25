import { CampaignList } from "@/components/admin/campaigns/CampaignList";
import { campaignService } from "@/lib/services/campaign-service";

export default async function CampaignsAdminPage() {
  // Auth check handled by admin layout
  const campaigns = await campaignService.getAllCampaigns();

  // Transform to match expected type
  const transformedCampaigns = campaigns.map((campaign) => ({
    id: campaign.id,
    code: campaign.code,
    status: campaign.status,
    priority: campaign.priority,
    contentEn: JSON.stringify(campaign.contentEn),
    contentMy: JSON.stringify(campaign.contentMy),
    ctaTextEn: null,
    ctaTextMy: null,
    ctaUrl: null,
    showAfter: campaign.startDate || new Date(),
    showUntil: campaign.endDate,
    placements: campaign.placements.map((p) => ({
      id: p.id,
      placementKey: p.placementKey,
      position: p.position,
      devices: p.devices,
      layoutConfig: p.layoutConfig,
      displayRules: p.displayRules,
    })),
  }));

  return (
    <div className="container px-4 py-8 mx-auto">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Campaign Management</h1>
        <p className="text-gray-600">
          Create, edit, and preview promotional campaigns
        </p>
      </div>

      <CampaignList campaigns={transformedCampaigns} />
    </div>
  );
}
