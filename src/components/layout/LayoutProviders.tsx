import AuthModal from "@/components/auth/AuthModal";
import { AuthModalProvider } from "@/components/auth/AuthModalContext";
import { CampaignContainerWrapper } from "@/components/layout/CampaignContainerWrapper";
import Chrome from "@/components/layout/Chrome";
import type { FooterDestination } from "@/components/layout/Footer";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import SessionProvider from "@/components/shared/SessionProvider";
import { Toaster } from "@/components/ui/sonner";

interface LayoutProvidersProps {
  children: React.ReactNode;
  footerDestinations: FooterDestination[];
}

export function LayoutProviders({
  children,
  footerDestinations,
}: LayoutProvidersProps) {
  return (
    <SessionProvider>
      <NotificationProvider>
        <AuthModalProvider>
          <Chrome footerDestinations={footerDestinations}>{children}</Chrome>
          <AuthModal />
          <Toaster />
          {/* Global bottom bar campaign placement - wrapped in Suspense for PPR */}
          <CampaignContainerWrapper />
        </AuthModalProvider>
      </NotificationProvider>
    </SessionProvider>
  );
}
