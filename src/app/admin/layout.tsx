import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin - Fishon",
  description: "Admin dashboard for Fishon",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen bg-gray-50">
          <main className="px-4 py-6 mx-auto max-w-7xl">{children}</main>
        </div>
      </body>
    </html>
  );
}
