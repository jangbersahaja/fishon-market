import { ProfileForm } from "@/components/account";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Profile Settings - Fishon.my",
  description: "Manage your profile information",
};

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    const locale = await getLocale();
    redirect(`/${locale}/login?next=/${locale}/account/profile`);
  }

  // Fetch complete user profile
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      image: true,
      streetAddress: true,
      city: true,
      state: true,
      postcode: true,
      country: true,
      emergencyName: true,
      emergencyPhone: true,
      emergencyRelation: true,
    },
  });

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login?next=/${locale}/account/profile`);
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your personal information and preferences
        </p>
      </div>

      <ProfileForm user={user} />
    </div>
  );
}
