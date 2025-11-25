"use client";

import { CampaignForm } from "@/components/admin/campaigns/CampaignForm";
import { Button } from "@/components/ui/button";
import type { CampaignFormData } from "@/lib/admin/campaign-actions";
import { updateCampaign } from "@/lib/admin/campaign-actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface EditCampaignClientProps {
  campaignId: string;
  initialData: CampaignFormData;
}

export function EditCampaignClient({
  campaignId,
  initialData,
}: EditCampaignClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CampaignFormData) => {
    setError(null);

    const result = await updateCampaign(campaignId, data);

    if (result.success) {
      toast.success("Campaign updated", {
        description: `Campaign "${data.code}" has been updated successfully.`,
      });
      router.push("/admin/campaigns");
      router.refresh();
    } else {
      setError(result.error || "Failed to update campaign");
      toast.error("Error", {
        description: result.error || "Failed to update campaign",
      });
    }
  };

  return (
    <div className="container max-w-5xl px-4 py-8 mx-auto">
      <div className="mb-8">
        <Link href="/admin/campaigns">
          <Button variant="outline" className="mb-4">
            ← Back to Campaigns
          </Button>
        </Link>
        <h1 className="mb-2 text-3xl font-bold">Edit Campaign</h1>
        <p className="text-gray-600">Campaign Code: {initialData.code}</p>
      </div>

      {error && (
        <div className="p-4 mb-6 text-red-800 bg-red-100 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      <CampaignForm
        initialData={initialData}
        onSubmit={handleSubmit}
        submitLabel="Update Campaign"
      />
    </div>
  );
}
