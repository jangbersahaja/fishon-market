/**
 * NotificationSettings Component
 *
 * Form for managing notification preferences with real-time updates.
 */

"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  disableNotificationSound,
  enableNotificationSound,
  isNotificationSoundEnabled,
} from "@/lib/notification-sound";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface NotificationPreferences {
  // Email preferences
  emailBookingCreated: boolean;
  emailBookingApproved: boolean;
  emailBookingRejected: boolean;
  emailBookingPaid: boolean;
  emailBookingCancelled: boolean;
  emailReviewSubmitted: boolean;
  emailReviewApproved: boolean;
  emailReviewRejected: boolean;
  emailAccountVerified: boolean;
  emailPaymentFailed: boolean;
  emailSystemAnnouncement: boolean;

  // Push preferences
  pushBookingCreated: boolean;
  pushBookingApproved: boolean;
  pushBookingRejected: boolean;
  pushBookingPaid: boolean;
  pushBookingCancelled: boolean;
  pushReviewSubmitted: boolean;
  pushReviewApproved: boolean;
  pushReviewRejected: boolean;
  pushAccountVerified: boolean;
  pushPaymentFailed: boolean;
  pushSystemAnnouncement: boolean;

  // SMS preferences
  smsBookingCreated: boolean;
  smsBookingApproved: boolean;
  smsBookingRejected: boolean;
  smsBookingPaid: boolean;
  smsBookingCancelled: boolean;
  smsReviewSubmitted: boolean;
  smsReviewApproved: boolean;
  smsReviewRejected: boolean;
  smsAccountVerified: boolean;
  smsPaymentFailed: boolean;
  smsSystemAnnouncement: boolean;
}

const notificationTypes = [
  { key: "BookingCreated", label: "booking_created" },
  { key: "BookingApproved", label: "booking_approved" },
  { key: "BookingRejected", label: "booking_rejected" },
  { key: "BookingPaid", label: "booking_paid" },
  { key: "BookingCancelled", label: "booking_cancelled" },
  { key: "ReviewSubmitted", label: "review_submitted" },
  { key: "ReviewApproved", label: "review_approved" },
  { key: "ReviewRejected", label: "review_rejected" },
  { key: "AccountVerified", label: "account_verified" },
  { key: "PaymentFailed", label: "payment_failed" },
  { key: "SystemAnnouncement", label: "system_announcement" },
];

export default function NotificationSettings() {
  const { data: session } = useSession();
  const t = useTranslations("account.notificationSettings");
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences from API
  useEffect(() => {
    async function loadPreferences() {
      try {
        const response = await fetch("/api/notifications/preferences");
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load preferences");
        }

        const data = await response.json();
        // API returns preferences directly, not wrapped
        setPreferences(data);
        setSoundEnabled(isNotificationSoundEnabled());
      } catch (error) {
        console.error("Failed to load notification preferences:", error);
        toast.error(t("error", { defaultValue: "Failed to load preferences" }));
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user) {
      loadPreferences();
    }
  }, [session]);

  // Handle sound toggle
  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    if (enabled) {
      enableNotificationSound();
      toast.success(
        t("soundEnabled", { defaultValue: "Notification sounds enabled" })
      );
    } else {
      disableNotificationSound();
      toast.success(
        t("soundDisabled", { defaultValue: "Notification sounds disabled" })
      );
    }
  };

  // Handle preference toggle
  const handleToggle = async (key: keyof NotificationPreferences) => {
    if (!preferences) return;

    const newValue = !preferences[key];
    const newPreferences = { ...preferences, [key]: newValue };
    setPreferences(newPreferences);

    // Save to API
    try {
      setIsSaving(true);
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });

      if (!response.ok) throw new Error("Failed to save preferences");

      toast.success(t("saved", { defaultValue: "Preferences updated" }));
    } catch (error) {
      console.error("Failed to save preferences:", error);
      toast.error(t("error", { defaultValue: "Failed to save preferences" }));
      // Revert on error
      setPreferences(preferences);
    } finally {
      setIsSaving(false);
    }
  };

  // Generic function to toggle all notifications for a specific channel
  const toggleAllNotifications = async (
    channel: "email" | "push" | "sms",
    enabled: boolean
  ) => {
    if (!preferences) return;

    const newPreferences = { ...preferences };
    notificationTypes.forEach(({ key }) => {
      const prefKey = `${channel}${key}` as keyof NotificationPreferences;
      newPreferences[prefKey] = enabled;
    });

    setPreferences(newPreferences);
    await saveAllPreferences(newPreferences);
  };

  // Enable all email notifications
  const enableAllEmail = () => toggleAllNotifications("email", true);

  // Disable all email notifications
  const disableAllEmail = () => toggleAllNotifications("email", false);

  // Enable all push notifications
  const enableAllPush = () => toggleAllNotifications("push", true);

  // Disable all push notifications
  const disableAllPush = () => toggleAllNotifications("push", false);

  // Enable all SMS notifications
  const enableAllSMS = () => toggleAllNotifications("sms", true);

  // Disable all SMS notifications
  const disableAllSMS = () => toggleAllNotifications("sms", false);

  // Save all preferences at once
  const saveAllPreferences = async (
    newPreferences: NotificationPreferences
  ) => {
    try {
      setIsSaving(true);
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPreferences),
      });

      if (!response.ok) throw new Error("Failed to save preferences");

      toast.success(t("saved", { defaultValue: "All preferences updated" }));
    } catch (error) {
      console.error("Failed to save preferences:", error);
      toast.error(t("error", { defaultValue: "Failed to save preferences" }));
      // Revert on error
      setPreferences(preferences);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-gray-100 rounded animate-pulse"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            {t("loadFailed", { defaultValue: "Failed to load preferences" })}
          </p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            {t("retry", { defaultValue: "Retry" })}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getNotificationTypeLabel = (label: string) => {
    const labelMap: Record<string, string> = {
      booking_created: "Booking created",
      booking_approved: "Booking approved",
      booking_rejected: "Booking rejected",
      booking_paid: "Booking paid",
      booking_cancelled: "Booking cancelled",
      review_submitted: "Review submitted",
      review_approved: "Review approved",
      review_rejected: "Review rejected",
      account_verified: "Account verified",
      payment_failed: "Payment failed",
      system_announcement: "System announcements",
    };
    return labelMap[label] || label;
  };

  return (
    <div className="space-y-6">
      {/* Sound Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sound Settings</CardTitle>
          <CardDescription>Control notification sounds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound-toggle">Notification sound</Label>
              <p className="text-sm text-muted-foreground">
                Play a sound when you receive a notification
              </p>
            </div>
            <Switch
              id="sound-toggle"
              checked={soundEnabled}
              onCheckedChange={handleSoundToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Receive notifications via email</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={enableAllEmail}
                disabled={isSaving}
              >
                Enable all
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={disableAllEmail}
                disabled={isSaving}
              >
                Disable all
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notificationTypes.map(({ key, label }) => {
              const emailKey = `email${key}` as keyof NotificationPreferences;
              return (
                <div
                  key={emailKey}
                  className="flex items-center justify-between"
                >
                  <Label htmlFor={emailKey}>
                    {getNotificationTypeLabel(label)}
                  </Label>
                  <Switch
                    id={emailKey}
                    checked={preferences[emailKey]}
                    onCheckedChange={() => handleToggle(emailKey)}
                    disabled={isSaving}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>In-App Notifications</CardTitle>
              <CardDescription>
                Receive real-time notifications in the app
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={enableAllPush}
                disabled={isSaving}
              >
                Enable all
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={disableAllPush}
                disabled={isSaving}
              >
                Disable all
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notificationTypes.map(({ key, label }) => {
              const pushKey = `push${key}` as keyof NotificationPreferences;
              return (
                <div
                  key={pushKey}
                  className="flex items-center justify-between"
                >
                  <Label htmlFor={pushKey}>
                    {getNotificationTypeLabel(label)}
                  </Label>
                  <Switch
                    id={pushKey}
                    checked={preferences[pushKey]}
                    onCheckedChange={() => handleToggle(pushKey)}
                    disabled={isSaving}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* SMS Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>SMS Notifications</CardTitle>
              <CardDescription>
                Receive SMS notifications to your phone
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={enableAllSMS}
                disabled={isSaving}
              >
                Enable all
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={disableAllSMS}
                disabled={isSaving}
              >
                Disable all
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notificationTypes.map(({ key, label }) => {
              const smsKey = `sms${key}` as keyof NotificationPreferences;
              return (
                <div key={smsKey} className="flex items-center justify-between">
                  <Label htmlFor={smsKey}>
                    {getNotificationTypeLabel(label)}
                  </Label>
                  <Switch
                    id={smsKey}
                    checked={preferences[smsKey]}
                    onCheckedChange={() => handleToggle(smsKey)}
                    disabled={isSaving}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
