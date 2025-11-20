/**
 * SMS Testing Interface
 * Development tool for testing SMS notifications via Exabytes integration
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  PhoneIcon,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast as showToast } from "sonner";

type NotificationType =
  | "BOOKING_CREATED"
  | "BOOKING_APPROVED"
  | "BOOKING_REJECTED"
  | "BOOKING_PAID"
  | "BOOKING_CANCELLED"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_FAILED"
  | "REVIEW_SUBMITTED"
  | "REVIEW_APPROVED"
  | "ACCOUNT_VERIFIED";

const SMS_TEMPLATES: Record<
  NotificationType,
  (data: Record<string, string>) => string
> = {
  BOOKING_CREATED: (data) =>
    `Fishon: Your booking for ${data.charterName} on ${data.tripDate} has been received. Total: RM${data.totalPrice}. We will notify you once the captain approves.`,
  BOOKING_APPROVED: (data) =>
    `Fishon: Great news! Your booking for ${data.charterName} on ${data.tripDate} has been approved by the captain. Please complete payment to confirm.`,
  BOOKING_REJECTED: (data) =>
    `Fishon: Unfortunately, your booking for ${data.charterName} was rejected by the captain. ${data.reason || "Please check other available dates."}`,
  BOOKING_PAID: (data) =>
    `Fishon: Payment received! Your booking for ${data.charterName} (${data.tripDate}) is confirmed. Check your email for details.`,
  BOOKING_CANCELLED: (data) =>
    `Fishon: Your booking for ${data.charterName} on ${data.tripDate} has been cancelled. Refund: RM${data.refundAmount}.`,
  PAYMENT_REFUNDED: (data) =>
    `Fishon: Refund processed. Amount: RM${data.refundAmount} has been credited to your account.`,
  PAYMENT_FAILED: (data) =>
    `Fishon: Payment failed for booking ${data.bookingId}. Please retry or contact support.`,
  REVIEW_SUBMITTED: (data) =>
    `Fishon: Your review has been submitted and is awaiting moderation. Thank you!`,
  REVIEW_APPROVED: (data) =>
    `Fishon: Your review for ${data.charterName} is now published. Other anglers can see it!`,
  ACCOUNT_VERIFIED: (data) =>
    `Fishon: Your account has been verified. Enjoy booking charters on Fishon!`,
};

export default function SMSTestPage() {
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("60105581238");
  const [notificationType, setNotificationType] =
    useState<NotificationType>("BOOKING_CREATED");
  const [customMessage, setCustomMessage] = useState("");
  const [templateData, setTemplateData] = useState<Record<string, string>>({
    charterName: "Deep Sea Fishing Charter",
    tripDate: "2025-11-25",
    totalPrice: "299.00",
    refundAmount: "299.00",
    bookingId: "BOOK-001",
    reason: "Dates not available",
  });
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  const currentTemplate = SMS_TEMPLATES[notificationType];
  const previewMessage = customMessage || currentTemplate(templateData);
  const messageLength = previewMessage.length;
  const willBeTruncated = messageLength > 160;

  const handleSendSMS = async () => {
    if (!phone.trim()) {
      showToast.error("Please enter a phone number");
      return;
    }

    setLoading(true);
    setSendResult(null);

    try {
      const response = await fetch("/api/dev/sms-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          notificationType,
          customMessage,
          templateData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSendResult({
          success: true,
          message: "SMS sent successfully!",
          details: `Message ID: ${data.messageId || "N/A"}`,
        });
        showToast.success("SMS sent successfully!");
      } else {
        setSendResult({
          success: false,
          message: data.error || "Failed to send SMS",
          details: data.details,
        });
        showToast.error(data.error || "Failed to send SMS");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setSendResult({
        success: false,
        message: "Failed to send SMS",
        details: errorMessage,
      });
      showToast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateTemplateData = (key: string, value: string) => {
    setTemplateData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container max-w-4xl p-6 mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-6 h-6 text-yellow-600" />
          <h1 className="text-3xl font-bold">SMS Test Interface</h1>
        </div>
        <p className="text-muted-foreground">
          Test SMS notifications via Exabytes integration. Development only.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuration Panel */}
        <div className="space-y-6 lg:col-span-2">
          {/* Phone Number */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhoneIcon className="w-4 h-4" />
                Recipient Phone
              </CardTitle>
              <CardDescription>Enter Malaysian phone number</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="60105581238"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-2 font-mono"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Format: 60XXXXXXXXX or 0XXXXXXXXX
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notification Type */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Type</CardTitle>
              <CardDescription>
                Select which SMS template to send
              </CardDescription>
            </CardHeader>
            <CardContent>
              <select
                value={notificationType}
                onChange={(e) => {
                  setNotificationType(e.target.value as NotificationType);
                  setCustomMessage("");
                }}
                className="w-full px-3 py-2 border rounded-md border-input bg-background"
              >
                <option value="BOOKING_CREATED">Booking Created</option>
                <option value="BOOKING_APPROVED">Booking Approved</option>
                <option value="BOOKING_REJECTED">Booking Rejected</option>
                <option value="BOOKING_PAID">Booking Paid</option>
                <option value="BOOKING_CANCELLED">Booking Cancelled</option>
                <option value="PAYMENT_REFUNDED">Payment Refunded</option>
                <option value="PAYMENT_FAILED">Payment Failed</option>
                <option value="REVIEW_SUBMITTED">Review Submitted</option>
                <option value="REVIEW_APPROVED">Review Approved</option>
                <option value="ACCOUNT_VERIFIED">Account Verified</option>
              </select>
            </CardContent>
          </Card>

          {/* Template Data */}
          <Card>
            <CardHeader>
              <CardTitle>Template Variables</CardTitle>
              <CardDescription>
                Customize template data for the selected notification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {notificationType === "BOOKING_CREATED" && (
                <>
                  <div>
                    <Label htmlFor="charterName">Charter Name</Label>
                    <Input
                      id="charterName"
                      value={templateData.charterName}
                      onChange={(e) =>
                        updateTemplateData("charterName", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tripDate">Trip Date</Label>
                    <Input
                      id="tripDate"
                      value={templateData.tripDate}
                      onChange={(e) =>
                        updateTemplateData("tripDate", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="totalPrice">Total Price (RM)</Label>
                    <Input
                      id="totalPrice"
                      value={templateData.totalPrice}
                      onChange={(e) =>
                        updateTemplateData("totalPrice", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                </>
              )}
              {notificationType === "BOOKING_APPROVED" && (
                <>
                  <div>
                    <Label htmlFor="charterName">Charter Name</Label>
                    <Input
                      id="charterName"
                      value={templateData.charterName}
                      onChange={(e) =>
                        updateTemplateData("charterName", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tripDate">Trip Date</Label>
                    <Input
                      id="tripDate"
                      value={templateData.tripDate}
                      onChange={(e) =>
                        updateTemplateData("tripDate", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                </>
              )}
              {notificationType === "BOOKING_REJECTED" && (
                <>
                  <div>
                    <Label htmlFor="charterName">Charter Name</Label>
                    <Input
                      id="charterName"
                      value={templateData.charterName}
                      onChange={(e) =>
                        updateTemplateData("charterName", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reason">Rejection Reason</Label>
                    <Input
                      id="reason"
                      value={templateData.reason}
                      onChange={(e) =>
                        updateTemplateData("reason", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                </>
              )}
              {notificationType === "BOOKING_PAID" && (
                <>
                  <div>
                    <Label htmlFor="charterName">Charter Name</Label>
                    <Input
                      id="charterName"
                      value={templateData.charterName}
                      onChange={(e) =>
                        updateTemplateData("charterName", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tripDate">Trip Date</Label>
                    <Input
                      id="tripDate"
                      value={templateData.tripDate}
                      onChange={(e) =>
                        updateTemplateData("tripDate", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                </>
              )}
              {notificationType === "BOOKING_CANCELLED" && (
                <>
                  <div>
                    <Label htmlFor="charterName">Charter Name</Label>
                    <Input
                      id="charterName"
                      value={templateData.charterName}
                      onChange={(e) =>
                        updateTemplateData("charterName", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tripDate">Trip Date</Label>
                    <Input
                      id="tripDate"
                      value={templateData.tripDate}
                      onChange={(e) =>
                        updateTemplateData("tripDate", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="refundAmount">Refund Amount (RM)</Label>
                    <Input
                      id="refundAmount"
                      value={templateData.refundAmount}
                      onChange={(e) =>
                        updateTemplateData("refundAmount", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                </>
              )}
              {notificationType === "PAYMENT_REFUNDED" && (
                <div>
                  <Label htmlFor="refundAmount">Refund Amount (RM)</Label>
                  <Input
                    id="refundAmount"
                    value={templateData.refundAmount}
                    onChange={(e) =>
                      updateTemplateData("refundAmount", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
              )}
              {notificationType === "PAYMENT_FAILED" && (
                <div>
                  <Label htmlFor="bookingId">Booking ID</Label>
                  <Input
                    id="bookingId"
                    value={templateData.bookingId}
                    onChange={(e) =>
                      updateTemplateData("bookingId", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
              )}
              {notificationType === "REVIEW_APPROVED" && (
                <div>
                  <Label htmlFor="charterName">Charter Name</Label>
                  <Input
                    id="charterName"
                    value={templateData.charterName}
                    onChange={(e) =>
                      updateTemplateData("charterName", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custom Message */}
          <Card>
            <CardHeader>
              <CardTitle>Custom Message (Optional)</CardTitle>
              <CardDescription>
                Leave empty to use template. Fill to override with custom
                message.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                placeholder="Enter custom SMS message..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full px-3 py-2 font-mono text-sm border rounded-md border-input bg-background"
                rows={3}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Custom messages override the default template
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Preview & Send Panel */}
        <div className="space-y-6">
          {/* Message Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Message Preview</CardTitle>
              <CardDescription>
                {willBeTruncated
                  ? "Will be truncated to 160 chars"
                  : "Fits in single SMS"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-mono text-sm break-words">
                  {previewMessage}
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Length:</span>
                  <span
                    className={`font-semibold ${
                      willBeTruncated ? "text-orange-600" : "text-green-600"
                    }`}
                  >
                    {messageLength} / 160
                  </span>
                </div>
                {willBeTruncated && (
                  <div className="text-xs text-orange-600">
                    ⚠️ Message will be truncated with &quot;...&quot;
                  </div>
                )}
              </div>

              <div className="pt-2 border-t">
                <p className="mb-2 text-xs text-muted-foreground">
                  Will send to:
                </p>
                <p className="font-mono text-sm font-semibold">{phone}</p>
              </div>
            </CardContent>
          </Card>

          {/* Send Button */}
          <Button
            onClick={handleSendSMS}
            disabled={loading || !phone.trim()}
            className="w-full h-10"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Send SMS"
            )}
          </Button>

          {/* Result */}
          {sendResult && (
            <Card
              className={`border-2 ${
                sendResult.success
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  {sendResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <CardTitle className="text-base">
                    {sendResult.success ? "Success" : "Failed"}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p
                  className={`text-sm font-semibold ${
                    sendResult.success ? "text-green-900" : "text-red-900"
                  }`}
                >
                  {sendResult.message}
                </p>
                {sendResult.details && (
                  <p className="font-mono text-xs break-words text-muted-foreground">
                    {sendResult.details}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Box */}
          <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
            <p className="text-xs text-blue-900">
              <strong>📝 Note:</strong> This interface sends real SMS via
              Exabytes. Only use for testing with your own phone number.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
