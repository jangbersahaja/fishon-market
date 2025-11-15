"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

export type PaymentMethod = "CARD" | "FPX" | "EWALLET" | "MOCK";
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
    label: "FPX (Online Banking)",
    badge: "Immediate Payment",
    badgeColor: "bg-green-100 text-green-700",
    flow: "DIRECT" as PaymentFlow,
    description:
      "Payment is processed immediately. You'll receive a full refund if the captain rejects your booking.",
    icon: "🏦",
  },
  {
    value: "EWALLET" as PaymentMethod,
    label: "E-Wallet",
    badge: "Immediate Payment",
    badgeColor: "bg-green-100 text-green-700",
    flow: "DIRECT" as PaymentFlow,
    description:
      "Payment is processed immediately. You'll receive a full refund if the captain rejects your booking.",
    icon: "📱",
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
        <Alert className="border-blue-200 bg-blue-50">
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
                  relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all
                  ${
                    isSelected
                      ? "border-[#ec2227] bg-red-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }
                `}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.value}
                  checked={isSelected}
                  onChange={() => onChange(method.value)}
                  className="mt-1 w-4 h-4 text-[#ec2227] border-gray-300 focus:ring-[#ec2227]"
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

        {/* Flow Explanation */}
        <div className="p-3 space-y-2 text-sm border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="font-medium text-gray-900">How it works:</h4>
          {value === "CARD" ? (
            <ul className="space-y-1 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>
                  We&apos;ll securely authorize your card for the booking amount
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>
                  If approved, your card will be charged within 12 hours
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>
                  If rejected or expired, the authorization is released (no
                  charge)
                </span>
              </li>
            </ul>
          ) : value === "MOCK" ? (
            <ul className="space-y-1 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>No real payment processing - for testing only</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>Simulates TOKENIZED flow behavior</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>Only available in development environment</span>
              </li>
            </ul>
          ) : (
            <ul className="space-y-1 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>You&apos;ll be redirected to complete the payment</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>
                  If the captain rejects your booking, you&apos;ll receive a
                  full refund
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>Refunds typically take 3-5 business days</span>
              </li>
            </ul>
          )}
        </div>

        {/* Cancellation Policy Note */}
        <div className="p-3 text-xs text-gray-600 border border-gray-200 rounded-lg bg-gray-50">
          <p className="mb-1 font-medium text-gray-700">Cancellation Policy:</p>
          <ul className="space-y-0.5">
            <li>• More than 30 days before trip: 80% refund</li>
            <li>• 15-30 days before trip: 50% refund</li>
            <li>• Less than 15 days before trip: No refund</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
