import AuthModal from "@/components/auth/AuthModal";
import { AuthModalProvider } from "@/components/auth/AuthModalContext";
import Chrome from "@/components/layout/Chrome";
import { CampaignContainer } from "@/components/promotional";
import SessionProvider from "@/components/shared/SessionProvider";
import { Toaster } from "@/components/ui/sonner";
import { locales } from "@/i18n/config";
import { auth } from "@/lib/auth/auth";
import {
    createOrganizationSchema,
    createWebSiteSchema,
    serializeSchema,
} from "@/lib/seo";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Inter, Oswald } from "next/font/google";
import { notFound } from "next/navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});
const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
});

export const metadata: Metadata = {
  title: "Fishon — Malaysia's Fishing & Charter Booking",
  description:
    "Fishon is Malaysia's first fishing & charter booking platform. Discover and book fishing charters across Malaysia.",
  metadataBase: new URL("https://www.fishon.my"),
  robots: { index: true, follow: true },
  openGraph: {
    title: "Fishon — Malaysia's Fishing & Charter Booking",
    description:
      "Discover and book fishing charters across Malaysia with Fishon.",
    url: "https://www.fishon.my",
    siteName: "Fishon",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Global structured data schemas
const organizationSchema = createOrganizationSchema();
const websiteSchema = createWebSiteSchema();

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Await params as required by Next.js 15
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client side is the easiest way to get started
  const messages = await getMessages({ locale });

  const session = await auth();

  return (
    <html lang={locale}>
      <head>
        {/* Global JSON-LD: Organization schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeSchema(organizationSchema),
          }}
        />
        {/* Global JSON-LD: WebSite schema with search action */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeSchema(websiteSchema),
          }}
        />
      </head>
      <body
        className={`flex flex-col font-sans ${inter.variable} ${oswald.variable}`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SessionProvider session={session}>
            <AuthModalProvider>
              <Chrome>{children}</Chrome>
              <AuthModal />
              <Toaster />
              {/* Global bottom bar campaign placement */}
              <CampaignContainer
                placementKey="global-bottom-bar"
                variant="bar"
              />
            </AuthModalProvider>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
