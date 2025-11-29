"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

// Common relationship options
const RELATIONSHIP_OPTIONS = [
  "spouse",
  "parent",
  "sibling",
  "child",
  "friend",
  "partner",
  "relative",
  "colleague",
  "other",
] as const;

type RelationshipOption = (typeof RELATIONSHIP_OPTIONS)[number];

interface RelationshipSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

export function RelationshipSelect({
  value,
  onChange,
  placeholder,
  disabled = false,
  hasError = false,
  className = "",
  id,
  name,
}: RelationshipSelectProps) {
  const t = useTranslations("common.relationships");
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if value matches a predefined option
  const isPredefinedValue = RELATIONSHIP_OPTIONS.includes(
    value?.toLowerCase() as RelationshipOption
  );

  // Initialize custom value if not a predefined option (only on mount)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && value && !isPredefinedValue) {
      setCustomValue(value);
      setShowCustomInput(true);
      initializedRef.current = true;
    }
  }, [value, isPredefinedValue]);

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

  const handleOptionSelect = (option: RelationshipOption) => {
    if (option === "other") {
      setShowCustomInput(true);
      setCustomValue("");
      onChange("");
    } else {
      setShowCustomInput(false);
      setCustomValue("");
      onChange(t(option));
    }
    setIsOpen(false);
  };

  const handleCustomChange = (newValue: string) => {
    setCustomValue(newValue);
    onChange(newValue);
  };

  const getDisplayValue = () => {
    if (showCustomInput) {
      return customValue || "";
    }
    if (!value) return "";
    // Try to find matching translation
    for (const opt of RELATIONSHIP_OPTIONS) {
      if (t(opt).toLowerCase() === value.toLowerCase()) {
        return t(opt);
      }
    }
    return value;
  };

  if (showCustomInput) {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <div className="flex gap-2">
          <input
            type="text"
            id={id}
            name={name}
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder={t("customPlaceholder")}
            disabled={disabled}
            className={`flex-1 px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-shadow ${
              disabled ? "bg-gray-100 cursor-not-allowed" : "bg-slate-50"
            } ${hasError ? "border-red-500" : "border-black/10"}`}
          />
          <button
            type="button"
            onClick={() => {
              setShowCustomInput(false);
              setCustomValue("");
              onChange("");
            }}
            disabled={disabled}
            className="px-3 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {t("backToList")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Select Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2.5 border rounded-lg text-left transition-colors ${
          disabled
            ? "bg-gray-100 cursor-not-allowed opacity-60"
            : "bg-slate-50 hover:border-gray-400 cursor-pointer"
        } ${hasError ? "border-red-500" : "border-black/10"}`}
      >
        <span className={value ? "text-gray-900" : "text-gray-500"}>
          {getDisplayValue() || placeholder || t("selectRelationship")}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 z-50 w-full mt-1 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-lg top-full">
          <div className="overflow-y-auto max-h-60">
            {RELATIONSHIP_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleOptionSelect(option)}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${
                  (option !== "other" &&
                    t(option).toLowerCase() === value?.toLowerCase()) ||
                  (option === "other" && showCustomInput)
                    ? "bg-gray-100 font-medium"
                    : ""
                }`}
              >
                {t(option)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
