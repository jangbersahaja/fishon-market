import { HomeWelcomeModal } from "@/components/campaigns/HomeWelcomeModal";
import PopularDestination from "@/components/marketing/PopularDestination";
import { authOptions } from "@/lib/auth/auth-options";
import type { CampaignContext } from "@/lib/services/campaign-service";
import { campaignService } from "@/lib/services/campaign-service";
import { getCharters } from "@/lib/services/charter-service";
import type { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { getLocale, setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { Suspense } from "react";
import BrandSection from "./BrandSection";
import BrowseByType from "./BrowseByType";
import HeroSection from "./HeroSection";
import TopTechniques from "./TopTechniques";
import TripsNearby from "./TripsNearby";

type RouteParams = Promise<{ locale: string }>;

export default async function Home({
  params,
}: {
  params: RouteParams;
}) {
  const { locale: paramLocale } = await params;
  setRequestLocale(paramLocale);
  
  const locale = await getLocale();
  const charters = await getCharters();

  // Fetch campaign data server-side
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("fishon_session_id")?.value;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }

  const context: CampaignContext = {
    userId: session?.user?.id,
    sessionId,
    userRole: session?.user?.role as UserRole | undefined,
    currentPage: "home",
    device: "DESKTOP", // Will be overridden by client-side responsive logic
    locale,
  };

  // Fetch campaigns for home welcome modal
  const campaigns = await campaignService.getActiveCampaigns(context);
  const campaign = campaigns.find((c) =>
    c.placements.some((p) => p.placementKey === "home-welcome-modal")
  );
  const placement = campaign?.placements.find(
    (p) => p.placementKey === "home-welcome-modal"
  );
  const content = campaign
    ? campaignService.getCampaignContent(campaign, locale)
    : null;
  const layoutConfig = placement?.layoutConfig as any;
  const variant = layoutConfig?.variant?.toLowerCase() || "modal";
  // Use custom ctaHref from content, or default to register page
  const ctaHref = content?.ctaHref || `/${locale}/register`;

  return (
    <div className="flex flex-col items-center min-h-screen font-sans bg-gray-50">
      {/* Welcome modal - shows after 5 seconds */}
      <HomeWelcomeModal
        campaignId={campaign?.id || null}
        placementKey={placement?.placementKey || "home-welcome-modal"}
        content={content}
        variant={variant}
        ctaHref={ctaHref}
        className={layoutConfig?.className || ""}
      />

      <main className="w-full">
        {/* Hero Section with Search */}
        <HeroSection />

        {/* Trips Nearby - Seamlessly connected to Hero's bottom gradient */}
        <div className="w-full bg-[#ec2227] pb-12 pt-8 -mt-1 relative z-10">
          <Suspense
            fallback={
              <div className="w-full px-5 mx-auto max-w-7xl py-7 text-white/80">
                Loading nearby trips…
              </div>
            }
          >
            <TripsNearby charters={charters} />
          </Suspense>
        </div>

        {/* Main Content */}
        <div className="flex flex-col w-full">
          <PopularDestination charters={charters} />
          <BrandSection />
          <BrowseByType charters={charters} />
          <TopTechniques charters={charters} />
        </div>
      </main>
    </div>
  );
}
