import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side role check as additional security layer
  const session = await auth();

  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    redirect("/login?error=admin_only");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 py-6 mx-auto max-w-7xl">{children}</main>
    </div>
  );
}
