"use client";

import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { useRef, useState } from "react";

interface PaymentFormProps {
  paymentUrl: string;
  paymentData: {
    merchantId: string;
    detail: string;
    amount: string;
    orderId: string;
    hash: string;
    name: string;
    email: string;
    phone: string;
    returnUrl: string;
    callbackUrl: string;
  };
}

export function PaymentForm({ paymentUrl, paymentData }: PaymentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    setIsSubmitting(true);
    formRef.current?.submit();
  };

  return (
    <>
      {/* Hidden form that submits to Senang Pay */}
      <form ref={formRef} action={paymentUrl} method="POST" className="hidden">
        <input type="hidden" name="detail" value={paymentData.detail} />
        <input type="hidden" name="amount" value={paymentData.amount} />
        <input type="hidden" name="order_id" value={paymentData.orderId} />
        <input type="hidden" name="hash" value={paymentData.hash} />
        <input type="hidden" name="name" value={paymentData.name} />
        <input type="hidden" name="email" value={paymentData.email} />
        <input type="hidden" name="phone" value={paymentData.phone} />
        <input type="hidden" name="return_url" value={paymentData.returnUrl} />
        <input
          type="hidden"
          name="callback_url"
          value={paymentData.callbackUrl}
        />
      </form>

      {/* Payment button */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#ec2227] px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-[#d01f23] focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <span className="animate-spin">⏳</span>
            <span>Redirecting to Payment Gateway...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            <span>Proceed to Payment - RM {paymentData.amount}</span>
          </>
        )}
      </Button>
    </>
  );
}
