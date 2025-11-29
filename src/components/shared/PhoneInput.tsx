"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Country codes for Malaysia and nearby countries
const COUNTRY_CODES = [
  { code: "+60", country: "MY", name: "Malaysia" },
  { code: "+65", country: "SG", name: "Singapore" },
  { code: "+62", country: "ID", name: "Indonesia" },
  { code: "+66", country: "TH", name: "Thailand" },
  { code: "+673", country: "BN", name: "Brunei" },
  { code: "+63", country: "PH", name: "Philippines" },
  { code: "+84", country: "VN", name: "Vietnam" },
  { code: "+91", country: "IN", name: "India" },
  { code: "+86", country: "CN", name: "China" },
  { code: "+81", country: "JP", name: "Japan" },
  { code: "+82", country: "KR", name: "South Korea" },
  { code: "+61", country: "AU", name: "Australia" },
  { code: "+44", country: "UK", name: "United Kingdom" },
  { code: "+1", country: "US", name: "United States" },
] as const;

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

export function PhoneInput({
  value,
  onChange,
  placeholder = "12 345 6789",
  disabled = false,
  hasError = false,
  className = "",
  id,
  name,
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse the value to extract country code and number
  const parsePhoneValue = (val: string) => {
    if (!val) return { countryCode: "+60", number: "" };

    // Try to match a country code at the start
    for (const cc of COUNTRY_CODES) {
      if (val.startsWith(cc.code)) {
        return {
          countryCode: cc.code,
          number: val.slice(cc.code.length).trim(),
        };
      }
    }

    // If no country code found, default to +60
    // Check if it starts with a digit (no code provided)
    if (/^\d/.test(val)) {
      return { countryCode: "+60", number: val };
    }

    return { countryCode: "+60", number: val };
  };

  const { countryCode, number } = parsePhoneValue(value);

  const handleCountryChange = (newCode: string) => {
    onChange(`${newCode}${number}`);
    setIsOpen(false);
  };

  const handleNumberChange = (newNumber: string) => {
    // Only allow digits and spaces
    const cleaned = newNumber.replace(/[^\d\s]/g, "");
    onChange(`${countryCode}${cleaned}`);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative flex ${className}`} ref={dropdownRef}>
      {/* Country Code Selector */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-3 py-2.5 border rounded-l-lg bg-gray-50 text-sm font-medium transition-colors ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : "hover:bg-gray-100 cursor-pointer"
        } ${hasError ? "border-red-500" : "border-gray-300 border-r-0"}`}
      >
        <span className="text-gray-700">{countryCode}</span>
        <ChevronDown
          className={`w-3 h-3 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 z-50 w-48 mt-1 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-lg top-full">
          <div className="overflow-y-auto max-h-60">
            {COUNTRY_CODES.map((cc) => (
              <button
                key={cc.code}
                type="button"
                onClick={() => handleCountryChange(cc.code)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                  cc.code === countryCode ? "bg-gray-100 font-medium" : ""
                }`}
              >
                <span className="text-gray-700">{cc.name}</span>
                <span className="text-gray-500">{cc.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Phone Number Input */}
      <input
        type="tel"
        id={id}
        name={name}
        value={number}
        onChange={(e) => handleNumberChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`flex-1 px-3 py-2.5 border rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-shadow ${
          disabled ? "bg-gray-100 cursor-not-allowed" : "bg-slate-50"
        } ${hasError ? "border-red-500" : "border-gray-300"}`}
      />
    </div>
  );
}

// Hook version for react-hook-form integration
interface PhoneInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
}

export function PhoneInputField({
  value,
  onChange,
  placeholder,
  disabled,
  hasError,
  className,
}: PhoneInputFieldProps) {
  return (
    <PhoneInput
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      hasError={hasError}
      className={className}
    />
  );
}
