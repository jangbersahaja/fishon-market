import { auth } from "@/lib/auth/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin - Fishon",
  description: "Admin dashboard for Fishon",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side role check as additional security layer
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session?.user?.id || !["ADMIN", "STAFF"].includes(userRole)) {
    redirect("/login?error=admin_only");
  }

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
