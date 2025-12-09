import type { FooterDestination } from "@/components/layout/Footer";
import { getAvailableStates } from "@/lib/helpers/popularity-helpers";
import { getCharters } from "@/lib/services/charter-service";

/**
 * Server component that fetches footer destinations with caching
 * This is wrapped in Suspense in the root layout for proper PPR support
 */
export async function FooterDestinationsWrapper({
  children,
}: {
  children: (destinations: FooterDestination[]) => React.ReactNode;
}) {
  let footerDestinations: FooterDestination[] = [];

  try {
    const charters = await getCharters();
    const states = getAvailableStates(charters);
    footerDestinations = states.map((s) => ({
      name: s.name,
      slug: s.slug,
      charterCount: s.charterCount,
    }));
  } catch (error) {
    console.error("Failed to fetch footer destinations:", error);
    // Fallback to empty array gracefully
  }

  return <>{children(footerDestinations)}</>;
}
