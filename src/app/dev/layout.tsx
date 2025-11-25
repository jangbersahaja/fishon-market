import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dev Tools - Fishon",
  description: "Development tools and testing pages",
};

export default function DevLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen bg-gray-100">
          <div className="bg-yellow-500 text-black px-4 py-2 text-center font-bold">
            🚧 DEVELOPMENT MODE 🚧
          </div>
          <main className="px-4 py-6 mx-auto max-w-7xl">{children}</main>
        </div>
      </body>
    </html>
  );
}
