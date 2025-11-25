"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CampaignPreviewModal } from "./CampaignPreviewModal";

interface Campaign {
  id: string;
  code: string;
  status: string;
  priority: number;
  contentEn: string;
  contentMy: string;
  ctaTextEn: string | null;
  ctaTextMy: string | null;
  ctaUrl: string | null;
  showAfter: Date;
  showUntil: Date | null;
  placements: Array<{
    id: string;
    placementKey: string;
    position: string;
    devices: string[];
    layoutConfig: any;
    displayRules: any;
  }>;
}

interface CampaignListProps {
  campaigns: Campaign[];
}

export function CampaignList({ campaigns }: CampaignListProps) {
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);

  return (
    <>
      <div className="mb-6">
        <Link href="/admin/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {campaign.code}
                    <Badge
                      variant={
                        campaign.status === "ACTIVE" ? "default" : "secondary"
                      }
                    >
                      {campaign.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Priority: {campaign.priority} • {campaign.placements.length}{" "}
                    placement(s)
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewCampaign(campaign)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                  <Link href={`/admin/campaigns/${campaign.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium">Content (EN):</p>
                  <p className="text-sm text-gray-600">{campaign.contentEn}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Placements:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {campaign.placements.map((p) => (
                      <Badge key={p.id} variant="outline">
                        {p.placementKey} ({p.position})
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  Active from{" "}
                  {new Date(campaign.showAfter).toLocaleDateString()} to{" "}
                  {campaign.showUntil
                    ? new Date(campaign.showUntil).toLocaleDateString()
                    : "indefinite"}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {previewCampaign && (
        <CampaignPreviewModal
          campaign={previewCampaign}
          onClose={() => setPreviewCampaign(null)}
        />
      )}
    </>
  );
}
