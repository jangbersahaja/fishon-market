"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Beaker, Building2, CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";

interface PaymentMethodSelectorProps {
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  enableMockPayment?: boolean;
  cardNumber: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardCvv: string;
  onCardNumberChange: (value: string) => void;
  onCardExpMonthChange: (value: string) => void;
  onCardExpYearChange: (value: string) => void;
  onCardCvvChange: (value: string) => void;
}

export function PaymentMethodSelector({
  paymentMethod,
  onPaymentMethodChange,
  enableMockPayment = false,
  cardNumber,
  cardExpMonth,
  cardExpYear,
  cardCvv,
  onCardNumberChange,
  onCardExpMonthChange,
  onCardExpYearChange,
  onCardCvvChange,
}: PaymentMethodSelectorProps) {
  const t = useTranslations("booking.payment.paymentMethod");

  return (
    <div className="space-y-6">
      <RadioGroup value={paymentMethod} onValueChange={onPaymentMethodChange}>
        {/* Credit/Debit Card */}
        <div className="flex items-center p-4 space-x-3 border rounded-lg cursor-pointer hover:bg-accent">
          <RadioGroupItem value="CARD" id="card" disabled />
          <Label
            htmlFor="card"
            className="flex items-center flex-1 gap-2 cursor-pointer"
          >
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-semibold">{t("card.title")}</p>
              <p className="text-sm text-muted-foreground">
                {t("card.description")}
              </p>
            </div>
          </Label>
        </div>

        {/* FPX & E-Wallet Combined */}
        <div className="flex items-center p-4 space-x-3 border rounded-lg cursor-pointer hover:bg-accent">
          <RadioGroupItem value="FPX" id="fpx" />
          <Label
            htmlFor="fpx"
            className="flex items-center flex-1 gap-2 cursor-pointer"
          >
            <Building2 className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-semibold">{t("fpx.title")}</p>
              <p className="text-sm text-muted-foreground">
                {t("fpx.description")}
              </p>
            </div>
          </Label>
        </div>

        {/* Mock Payment (Dev Only) */}
        {enableMockPayment && (
          <div className="flex items-center p-4 space-x-3 border rounded-lg cursor-pointer bg-amber-50 hover:bg-amber-100">
            <RadioGroupItem value="MOCK" id="mock" />
            <Label
              htmlFor="mock"
              className="flex items-center flex-1 gap-2 cursor-pointer"
            >
              <Beaker className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-semibold">{t("mock.title")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("mock.description")}
                </p>
              </div>
            </Label>
          </div>
        )}
      </RadioGroup>

      {/* Card Details (only show if Card selected) */}
      {paymentMethod === "CARD" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">{t("cardForm.cardNumber")}</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => onCardNumberChange(e.target.value)}
                maxLength={19}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expMonth">{t("cardForm.month")}</Label>
                <Input
                  id="expMonth"
                  placeholder="MM"
                  value={cardExpMonth}
                  onChange={(e) => onCardExpMonthChange(e.target.value)}
                  maxLength={2}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expYear">{t("cardForm.year")}</Label>
                <Input
                  id="expYear"
                  placeholder="YY"
                  value={cardExpYear}
                  onChange={(e) => onCardExpYearChange(e.target.value)}
                  maxLength={2}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">{t("cardForm.cvv")}</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  value={cardCvv}
                  onChange={(e) => onCardCvvChange(e.target.value)}
                  maxLength={3}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
