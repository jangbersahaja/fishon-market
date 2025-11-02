// Reusable filter section wrapper
"use client";

import { useState } from "react";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";

interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}

export function FilterSection({
  title,
  icon,
  children,
  defaultOpen = false,
  badge,
}: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 text-left transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-2.5">
          <div className="text-[#ec2227]">{icon}</div>
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold text-white bg-[#ec2227] rounded-full">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <IoChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <IoChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
