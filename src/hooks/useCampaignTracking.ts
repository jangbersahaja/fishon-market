import { useCallback } from "react";

export interface TrackingContext {
  campaignId: string;
  placementKey: string;
}

export type TrackingAction = "IMPRESSION" | "CLICK" | "DISMISS" | "CONVERSION";

/**
 * Custom hook for tracking campaign interactions
 *
 * @example
 * const { trackImpression, trackClick, trackDismiss } = useCampaignTracking({
 *   campaignId: "reg-welcome-2025",
 *   placementKey: "search-sidebar"
 * });
 *
 * // Track impression
 * useEffect(() => {
 *   trackImpression();
 * }, []);
 *
 * // Track click
 * const handleCTAClick = () => {
 *   trackClick();
 *   router.push("/register");
 * };
 */
export function useCampaignTracking(context: TrackingContext) {
  const track = useCallback(
    async (action: TrackingAction) => {
      try {
        const response = await fetch("/api/campaigns/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: context.campaignId,
            placementKey: context.placementKey,
            action,
          }),
        });

        if (!response.ok) {
          console.error(
            `[useCampaignTracking] Failed to track ${action}:`,
            response.statusText
          );
        }
      } catch (error) {
        console.error(
          `[useCampaignTracking] Failed to track ${action}:`,
          error
        );
        // Fail silently - tracking errors shouldn't break UX
      }
    },
    [context.campaignId, context.placementKey]
  );

  const trackImpression = useCallback(() => track("IMPRESSION"), [track]);
  const trackClick = useCallback(() => track("CLICK"), [track]);
  const trackDismiss = useCallback(() => track("DISMISS"), [track]);
  const trackConversion = useCallback(() => track("CONVERSION"), [track]);

  return {
    track,
    trackImpression,
    trackClick,
    trackDismiss,
    trackConversion,
  };
}
