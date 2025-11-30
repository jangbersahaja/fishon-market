"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Tag, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

interface PromoCodeInputProps {
  charterId: string;
  subtotal: number;
  onPromoApplied: (data: {
    code: string;
    discount: number;
    promoCodeId: string;
  }) => void;
  onPromoRemoved: () => void;
  disabled?: boolean;
  className?: string;
}

interface ValidationResponse {
  valid: boolean;
  discount?: {
    type: string;
    percentage?: number;
    fixedAmount?: number;
    amount: number;
  };
  promoCodeId?: string;
  maxDiscount?: number | null;
  error?: string;
}

export function PromoCodeInput({
  charterId,
  subtotal,
  onPromoApplied,
  onPromoRemoved,
  disabled = false,
  className = "",
}: PromoCodeInputProps) {
  const t = useTranslations("booking.checkout.promo");
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount: number;
    promoCodeId: string;
    maxDiscount?: number | null;
  } | null>(null);

  const validatePromoCode = useCallback(async () => {
    if (!code.trim()) {
      setError(t("errors.codeRequired"));
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          charterId,
          subtotal,
        }),
      });

      const data: ValidationResponse = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError(t("errors.loginRequired"));
        } else if (response.status === 403) {
          setError(t("errors.guestsNotAllowed"));
        } else {
          setError(data.error || t("errors.validationFailed"));
        }
        return;
      }

      if (data.valid && data.discount && data.promoCodeId) {
        const promoData = {
          code: code.trim().toUpperCase(),
          discount: data.discount.amount,
          promoCodeId: data.promoCodeId,
          maxDiscount: data.maxDiscount,
        };
        setAppliedPromo(promoData);
        onPromoApplied(promoData);
        setError(null);
      } else {
        setError(data.error || t("errors.invalidCode"));
      }
    } catch (err) {
      console.error("Promo validation error:", err);
      setError(t("errors.networkError"));
    } finally {
      setIsValidating(false);
    }
  }, [code, charterId, subtotal, onPromoApplied, t]);

  const removePromo = useCallback(() => {
    setAppliedPromo(null);
    setCode("");
    setError(null);
    onPromoRemoved();
  }, [onPromoRemoved]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !appliedPromo && !isValidating) {
      e.preventDefault();
      validatePromoCode();
    }
  };

  // Applied state
  if (appliedPromo) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label className="text-sm font-medium">{t("label")}</Label>
        <div className="flex items-center gap-2 p-3 border border-green-200 rounded-lg bg-green-50">
          <CheckCircle2 className="flex-shrink-0 w-5 h-5 text-green-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-900">
              {appliedPromo.code}
            </p>
            <p className="text-xs text-green-700">
              {t("success", { amount: appliedPromo.discount.toFixed(2) })}
            </p>
            {appliedPromo.maxDiscount && (
              <p className="text-xs text-green-600">
                {t("maxDiscountCap", { amount: appliedPromo.maxDiscount })}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={removePromo}
            disabled={disabled}
            className="h-8 px-2 text-green-700 hover:text-green-900 hover:bg-green-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Input state
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="promo-code" className="text-sm font-medium">
        {t("label")}
        <span className="ml-1 text-muted-foreground">({t("optional")})</span>
      </Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
          <Input
            id="promo-code"
            type="text"
            placeholder={t("placeholder")}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            onKeyPress={handleKeyPress}
            disabled={disabled || isValidating}
            className="uppercase pl-9"
            maxLength={20}
          />
        </div>
        <Button
          type="button"
          onClick={validatePromoCode}
          disabled={!code.trim() || disabled || isValidating}
          variant="outline"
          className="px-6"
        >
          {isValidating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("applying")}
            </>
          ) : (
            t("apply")
          )}
        </Button>
      </div>
      {error && (
        <p className="flex items-start gap-2 text-sm text-destructive">
          <span className="mt-0.5">⚠️</span>
          <span>{error}</span>
        </p>
      )}
      <p className="text-xs text-muted-foreground">{t("hint")}</p>
    </div>
  );
}
