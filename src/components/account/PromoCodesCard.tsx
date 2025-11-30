"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Calendar, Copy, Gift, Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface PromoCode {
  code: string;
  name: string;
  description: string;
  type: "PERCENTAGE" | "FIXED";
  percentage?: number;
  fixedAmount?: number;
  maxDiscount?: number | null;
  validFrom: string;
  validUntil: string;
  usedAt: string | null;
}

export function PromoCodesCard() {
  const t = useTranslations("account.promoCodes");
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPromoCodes = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/account/promo-codes");

      if (!response.ok) {
        if (response.status === 401) {
          setError(t("errors.unauthorized"));
          return;
        }
        throw new Error("Failed to fetch promo codes");
      }

      const data = await response.json();
      setPromoCodes(data.promoCodes || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching promo codes:", err);
      setError(t("errors.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchPromoCodes();
  }, [fetchPromoCodes]);

  const copyToClipboard = useCallback(
    (code: string) => {
      navigator.clipboard.writeText(code);
      toast.success(t("copied"), {
        description: t("copiedDescription", { code }),
      });
    },
    [t]
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const availablePromoCodes = promoCodes.filter((p) => !p.usedAt);
  const usedPromoCodes = promoCodes.filter((p) => p.usedAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          {t("title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Available Promo Codes */}
        {availablePromoCodes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">
              {t("available")} ({availablePromoCodes.length})
            </h3>
            {availablePromoCodes.map((promo) => (
              <div
                key={promo.code}
                className="border rounded-lg p-4 space-y-3 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40 transition-colors"
              >
                {/* Code and Copy Button */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary flex-shrink-0" />
                      <code className="text-lg font-bold text-primary tracking-wider">
                        {promo.code}
                      </code>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {promo.name}
                    </p>
                    {promo.description && (
                      <p className="text-xs text-muted-foreground">
                        {promo.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => copyToClipboard(promo.code)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors border border-primary/20 hover:border-primary/40"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {t("copy")}
                  </button>
                </div>

                {/* Discount Amount */}
                <div className="flex flex-col gap-1 px-3 py-2 bg-white/50 rounded-md">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                      {promo.type === "PERCENTAGE" && promo.percentage
                        ? t("percentageOff", { percentage: promo.percentage })
                        : promo.type === "FIXED" && promo.fixedAmount
                          ? t("fixedOff", { amount: promo.fixedAmount })
                          : t("discount")}
                    </span>
                  </div>
                  {promo.type === "PERCENTAGE" && promo.maxDiscount && (
                    <span className="text-xs text-muted-foreground ml-6">
                      {t("maxDiscountCap", { amount: promo.maxDiscount })}
                    </span>
                  )}
                </div>

                {/* Validity Period */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {t("validUntil", {
                      date: format(new Date(promo.validUntil), "dd MMM yyyy"),
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Used Promo Codes */}
        {usedPromoCodes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t("used")} ({usedPromoCodes.length})
            </h3>
            {usedPromoCodes.map((promo) => (
              <div
                key={promo.code}
                className="border rounded-lg p-4 space-y-2 bg-muted/30 border-muted opacity-60"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <code className="text-base font-bold text-muted-foreground">
                        {promo.code}
                      </code>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {promo.name}
                    </p>
                  </div>
                </div>
                {promo.usedAt && (
                  <p className="text-xs text-muted-foreground">
                    {t("usedOn", {
                      date: format(new Date(promo.usedAt), "dd MMM yyyy"),
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {availablePromoCodes.length === 0 && usedPromoCodes.length === 0 && (
          <div className="text-center py-8">
            <Gift className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("emptyHint")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
