import AuthModal from "@/components/auth/AuthModal";
import { AuthModalProvider } from "@/components/auth/AuthModalContext";
import Chrome from "@/components/layout/Chrome";
import SessionProvider from "@/components/shared/SessionProvider";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@/lib/auth/auth";
import {
  createOrganizationSchema,
  createWebSiteSchema,
  serializeSchema,
} from "@/lib/seo";
import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";

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

// Global structured data schemas
const organizationSchema = createOrganizationSchema();
const websiteSchema = createWebSiteSchema();

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html lang="ms">
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
        <SessionProvider session={session}>
          <AuthModalProvider>
            <Chrome>{children}</Chrome>
            <AuthModal />
            <Toaster />
          </AuthModalProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
