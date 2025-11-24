"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Users } from "lucide-react";
import { useTranslations } from "next-intl";

interface PaymentTripSummaryCardProps {
  charterName: string;
  location?: string;
  tripName: string;
  primaryDateLabel: string;
  daysLabel: string;
  startTime?: string;
  totalGuests: number;
  guestBreakdown: string;
  note?: string;
}

export function PaymentTripSummaryCard({
  charterName,
  location,
  tripName,
  primaryDateLabel,
  daysLabel,
  startTime,
  totalGuests,
  guestBreakdown,
  note,
}: PaymentTripSummaryCardProps) {
  const t = useTranslations("booking.payment.tripSummary");

  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          {t("title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-4">
          {/* Charter Info */}
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {t("charter")}
              </p>
              <p className="text-lg font-semibold">{charterName}</p>
              {location && (
                <p className="text-sm text-muted-foreground">{location}</p>
              )}
              <p className="inline-flex items-center gap-2 mt-2 text-xs font-medium text-muted-foreground">
                {t("trip")}
                <Badge variant="secondary" className="text-xs font-semibold">
                  {tripName}
                </Badge>
              </p>
            </div>
          </div>

          {/* Schedule Info */}
          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {t("schedule")}
              </p>
              <p className="font-semibold">{primaryDateLabel}</p>
              <p className="text-sm text-muted-foreground">
                {daysLabel}
                {startTime && <> • {startTime}</>}
              </p>
            </div>
          </div>

          {/* Guests Info */}
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {t("guests")}
              </p>
              <p className="font-semibold">
                {t("guestCount", { count: totalGuests })}
              </p>
              <p className="text-sm text-muted-foreground">{guestBreakdown}</p>
            </div>
          </div>
        </div>

        {/* Special Requests */}
        {note && (
          <div className="p-4 border rounded-lg bg-muted/40">
            <p className="mb-1 text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              {t("specialRequests")}
            </p>
            <p className="text-sm text-muted-foreground">{note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
