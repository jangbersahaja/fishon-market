"use client";

import { CreditCard, Shield } from "lucide-react";

interface MockPaymentFormProps {
  bookingId: string;
  amount: string;
  onSubmit: () => void;
}

export function MockPaymentForm({
  bookingId,
  amount,
  onSubmit,
}: MockPaymentFormProps) {
  return (
    <div className="space-y-6">
      {/* Development Mode Notice */}
      <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Development Mode - Mock Payment</p>
            <p className="mt-1">
              Payment gateway is not configured. This is a mock payment that
              will simulate a successful transaction for testing purposes.
            </p>
            <p className="mt-2 text-xs">
              To use real Senang Pay: Set <code>SENANGPAY_MERCHANT_ID</code>,{" "}
              <code>SENANGPAY_SECRET_KEY</code>, and <code>SENANGPAY_MODE</code>{" "}
              in your environment variables.
            </p>
          </div>
        </div>
      </div>

      {/* Mock Payment Button */}
      <form action={onSubmit}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#ec2227] px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-[#d01f23] focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:ring-offset-2"
        >
          <CreditCard className="w-5 h-5" />
          Confirm Payment (MOCK) - RM {amount}
        </button>
      </form>

      {/* Security Notice */}
      <div className="text-xs text-center text-gray-500">
        <p>🔒 In production, payments are processed through Senang Pay</p>
      </div>
    </div>
  );
}
