import { CampaignContainer } from "@/components/promotional";
import { Suspense } from "react";

/**
 * Server component wrapper for CampaignContainer
 * Fetches campaigns server-side to avoid "Server Functions cannot be called during initial render" error
 */
export function CampaignContainerWrapper() {
  return (
    <Suspense fallback={null}>
      <CampaignContainer placementKey="global-bottom-bar" variant="bar" />
    </Suspense>
  );
}
