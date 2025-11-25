"use client";

import { PromotionalBanner } from "@/components/promotional/PromotionalBanner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

interface Campaign {
  id: string;
  code: string;
  contentEn: string;
  contentMy: string;
  ctaTextEn: string | null;
  ctaTextMy: string | null;
  ctaUrl: string | null;
  placements: Array<{
    id: string;
    placementKey: string;
    position: string;
    devices: string[];
    layoutConfig: any;
    displayRules: any;
  }>;
}

interface CampaignPreviewModalProps {
  campaign: Campaign;
  onClose: () => void;
}

export function CampaignPreviewModal({
  campaign,
  onClose,
}: CampaignPreviewModalProps) {
  const [selectedPlacement, setSelectedPlacement] = useState(
    campaign.placements[0]
  );
  const [locale, setLocale] = useState<"en" | "ms">("en");

  const parseContent = (content: string) => {
    try {
      return JSON.parse(content);
    } catch {
      return {
        title: content,
        subtitle: "",
        cta: "Learn More",
        benefits: [],
      };
    }
  };

  const content = parseContent(
    locale === "en" ? campaign.contentEn : campaign.contentMy
  );

  const layoutConfig = selectedPlacement.layoutConfig as any;
  const variant = layoutConfig?.variant?.toLowerCase() || "card";

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Campaign Preview: {campaign.code}</DialogTitle>
          <DialogDescription>
            Preview how this campaign will appear across different placements
            and languages
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Placement Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">Placement:</label>
            <div className="flex flex-wrap gap-2">
              {campaign.placements.map((placement) => (
                <Button
                  key={placement.id}
                  variant={
                    selectedPlacement.id === placement.id
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedPlacement(placement)}
                >
                  {placement.placementKey}
                </Button>
              ))}
            </div>
          </div>

          {/* Language Tabs */}
          <Tabs value={locale} onValueChange={(v) => setLocale(v as any)}>
            <TabsList>
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="ms">Bahasa Malaysia</TabsTrigger>
            </TabsList>

            <TabsContent value={locale} className="space-y-4">
              {/* Placement Info */}
              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <p>
                  <strong>Position:</strong> {selectedPlacement.position}
                </p>
                <p>
                  <strong>Devices:</strong>{" "}
                  {selectedPlacement.devices.join(", ")}
                </p>
                <p>
                  <strong>Variant:</strong> {variant.toUpperCase()}
                </p>
                {selectedPlacement.displayRules && (
                  <p>
                    <strong>Display Rules:</strong>{" "}
                    {JSON.stringify(selectedPlacement.displayRules)}
                  </p>
                )}
              </div>

              {/* Preview Container */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <div className="flex items-center justify-center min-h-[200px]">
                  {variant === "modal" ? (
                    <div className="w-full max-w-[600px]">
                      <PromotionalBanner
                        campaignId={campaign.id}
                        placementKey={selectedPlacement.placementKey}
                        content={content}
                        variant="modal"
                        dismissible={true}
                        ctaHref={campaign.ctaUrl || "#"}
                        onDismiss={() => {}}
                      />
                    </div>
                  ) : variant === "bar" ? (
                    <div className="w-full">
                      <PromotionalBanner
                        campaignId={campaign.id}
                        placementKey={selectedPlacement.placementKey}
                        content={content}
                        variant="bar"
                        dismissible={true}
                        ctaHref={campaign.ctaUrl || "#"}
                        onDismiss={() => {}}
                      />
                    </div>
                  ) : (
                    <div className="w-full max-w-[350px]">
                      <PromotionalBanner
                        campaignId={campaign.id}
                        placementKey={selectedPlacement.placementKey}
                        content={content}
                        variant="card"
                        dismissible={true}
                        ctaHref={campaign.ctaUrl || "#"}
                        onDismiss={() => {}}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Content JSON */}
              <details className="text-sm">
                <summary className="cursor-pointer font-medium mb-2">
                  View Content JSON
                </summary>
                <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
                  {JSON.stringify(content, null, 2)}
                </pre>
              </details>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
