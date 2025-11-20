"use client";

import { CreditCard, Lock } from "lucide-react";
import { FieldErrors, UseFormRegister } from "react-hook-form";

interface CardDetailsInputProps {
  register: UseFormRegister<any>;
  errors: FieldErrors;
}

export default function CardDetailsInput({
  register,
  errors,
}: CardDetailsInputProps) {
  // Format card number with spaces (4-4-4-4)
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(" ");
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => currentYear + i);
  const months = [
    { value: "01", label: "01 - January" },
    { value: "02", label: "02 - February" },
    { value: "03", label: "03 - March" },
    { value: "04", label: "04 - April" },
    { value: "05", label: "05 - May" },
    { value: "06", label: "06 - June" },
    { value: "07", label: "07 - July" },
    { value: "08", label: "08 - August" },
    { value: "09", label: "09 - September" },
    { value: "10", label: "10 - October" },
    { value: "11", label: "11 - November" },
    { value: "12", label: "12 - December" },
  ];

  return (
    <div className="p-5 space-y-4 bg-white border rounded-2xl border-black/10 sm:p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="w-5 h-5 text-gray-700" />
          <h3 className="text-base font-semibold">Card Details</h3>
        </div>
        <p className="text-sm text-gray-600">
          Your card will be authorized but not charged until the captain
          confirms your booking
        </p>
      </div>

      {/* Security Notice */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Lock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-900">
          Your payment information is encrypted and secure. We use Senang Pay
          for payment processing.
        </p>
      </div>

      {/* Card Number */}
      <div>
        <label
          htmlFor="cardNumber"
          className="block mb-2 text-sm font-medium text-gray-700"
        >
          Card Number
        </label>
        <input
          id="cardNumber"
          type="text"
          placeholder="1234 5678 9012 3456"
          maxLength={19} // 16 digits + 3 spaces
          className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-colors ${
            errors.cardNumber
              ? "border-red-500 bg-red-50"
              : "border-gray-300 bg-white"
          }`}
          {...register("cardNumber", {
            onChange: (e) => {
              const formatted = formatCardNumber(e.target.value);
              e.target.value = formatted;
            },
          })}
        />
        {errors.cardNumber && (
          <p className="mt-1 text-xs text-red-600">
            {errors.cardNumber.message as string}
          </p>
        )}
      </div>

      {/* Expiry & CVV Row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Expiry Month */}
        <div>
          <label
            htmlFor="cardExpMonth"
            className="block mb-2 text-sm font-medium text-gray-700"
          >
            Month
          </label>
          <select
            id="cardExpMonth"
            className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-colors ${
              errors.cardExpMonth
                ? "border-red-500 bg-red-50"
                : "border-gray-300 bg-white"
            }`}
            {...register("cardExpMonth")}
          >
            <option value="">MM</option>
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
          {errors.cardExpMonth && (
            <p className="mt-1 text-xs text-red-600">Required</p>
          )}
        </div>

        {/* Expiry Year */}
        <div>
          <label
            htmlFor="cardExpYear"
            className="block mb-2 text-sm font-medium text-gray-700"
          >
            Year
          </label>
          <select
            id="cardExpYear"
            className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-colors ${
              errors.cardExpYear
                ? "border-red-500 bg-red-50"
                : "border-gray-300 bg-white"
            }`}
            {...register("cardExpYear")}
          >
            <option value="">YYYY</option>
            {years.map((year) => (
              <option key={year} value={year.toString()}>
                {year}
              </option>
            ))}
          </select>
          {errors.cardExpYear && (
            <p className="mt-1 text-xs text-red-600">Required</p>
          )}
        </div>

        {/* CVV */}
        <div>
          <label
            htmlFor="cardCvv"
            className="block mb-2 text-sm font-medium text-gray-700"
          >
            CVV
          </label>
          <input
            id="cardCvv"
            type="text"
            placeholder="123"
            maxLength={4}
            className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-colors ${
              errors.cardCvv
                ? "border-red-500 bg-red-50"
                : "border-gray-300 bg-white"
            }`}
            {...register("cardCvv", {
              onChange: (e) => {
                // Only allow digits
                e.target.value = e.target.value.replace(/\D/g, "");
              },
            })}
          />
          {errors.cardCvv && (
            <p className="mt-1 text-xs text-red-600">
              {errors.cardCvv.message as string}
            </p>
          )}
        </div>
      </div>

      {/* Help Text */}
      <p className="text-xs text-gray-500">
        The CVV is the 3 or 4 digit security code on the back of your card
      </p>
    </div>
  );
}
