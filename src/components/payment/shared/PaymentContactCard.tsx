"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";

interface PaymentContactCardProps {
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
}

export function PaymentContactCard({
  contactName,
  contactEmail,
  contactPhone,
}: PaymentContactCardProps) {
  const t = useTranslations("booking.payment.contactDetails");

  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          {t("title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="p-4 border border-dashed rounded-xl bg-muted/40">
          <dl className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <UserRound className="w-4 h-4" /> {t("name")}
              </dt>
              <dd className="font-medium text-right">{contactName}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" /> {t("email")}
              </dt>
              <dd className="font-medium text-right break-all">
                {contactEmail}
              </dd>
            </div>
            {contactPhone && (
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" /> {t("phone")}
                </dt>
                <dd className="font-medium text-right">{contactPhone}</dd>
              </div>
            )}
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}
