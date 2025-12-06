/**
 * Notification Settings Page
 *
 * Allows users to manage notification preferences:
 * - Email notifications (per type)
 * - Push notifications (per type)
 * - Sound on/off
 * - In-app notifications on/off
 */

import NotificationSettings from "@/components/account/NotificationSettings";
import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Notification Settings — Fishon",
  description: "Manage your notification preferences",
};

type RouteParams = Promise<{ locale: string }>;

export default async function NotificationSettingsPage({
  params,
}: {
  params: RouteParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="container max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Manage how and when you receive notifications
        </p>
      </div>

      <NotificationSettings />
    </div>
  );
}
