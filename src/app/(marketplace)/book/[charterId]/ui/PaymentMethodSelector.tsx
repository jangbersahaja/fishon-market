"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

export type PaymentMethod = "CARD" | "FPX" | "MOCK";
export type PaymentFlow = "TOKENIZED" | "DIRECT" | "MOCK";

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  error?: string;
}

const basePaymentMethods = [
  {
    value: "CARD" as PaymentMethod,
    label: "Credit/Debit Card",
    badge: "No Charge Until Approved",
    badgeColor: "bg-blue-100 text-blue-700",
    flow: "TOKENIZED" as PaymentFlow,
    description:
      "Your card will be authorized but not charged until the captain approves your booking.",
    icon: "💳",
  },
  {
    value: "FPX" as PaymentMethod,
    label: "FPX or E-Wallet",
    badge: "Immediate Payment",
    badgeColor: "bg-green-100 text-green-700",
    flow: "DIRECT" as PaymentFlow,
    description:
      "Payment is processed immediately. You'll receive a full refund if the captain rejects your booking.",
    icon: "🏦",
  },
];

// Add MOCK payment in development mode
const mockPaymentMethod = {
  value: "MOCK" as PaymentMethod,
  label: "Mock Payment (Dev Only)",
  badge: "Testing Mode",
  badgeColor: "bg-purple-100 text-purple-700",
  flow: "MOCK" as PaymentFlow,
  description:
    "For development testing only. Simulates payment without real charges.",
  icon: "🎭",
};

const paymentMethods =
  process.env.NODE_ENV === "development"
    ? [...basePaymentMethods, mockPaymentMethod]
    : basePaymentMethods;

export default function PaymentMethodSelector({
  value,
  onChange,
  error,
}: PaymentMethodSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Payment Method</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Alert */}
        <Alert className="ring-blue-200 bg-blue-50">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            The captain has 12 hours to approve your booking request.
          </AlertDescription>
        </Alert>

        {/* Payment Method Options */}
        <div className="space-y-3">
          {paymentMethods.map((method) => {
            const isSelected = value === method.value;
            return (
              <label
                key={method.value}
                className={`
                  relative flex items-start p-3 ring bg-slate-50 rounded-lg cursor-pointer transition-all
                  ${
                    isSelected
                      ? "ring-[#ec2227] ring-2"
                      : "ring-gray-200 hover:ring-gray-300 "
                  }
                `}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.value}
                  checked={isSelected}
                  onChange={() => onChange(method.value)}
                  className="mt-1 w-4 h-4 text-[#ec2227] ring-gray-300 focus:ring-[#ec2227]"
                />
                <div className="flex-1 ml-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{method.icon}</span>
                      <span className="font-medium text-gray-900">
                        {method.label}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${method.badgeColor}`}
                    >
                      {method.badge}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{method.description}</p>
                </div>
              </label>
            );
          })}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
