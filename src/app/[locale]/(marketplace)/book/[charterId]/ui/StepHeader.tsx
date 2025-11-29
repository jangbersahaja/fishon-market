"use client";

import { Calendar, MessageSquare, User } from "lucide-react";

interface StepHeaderProps {
  step: 1 | 2 | 3;
  title: string;
  description: string;
}

const stepIcons = {
  1: Calendar,
  2: User,
  3: MessageSquare,
};

const stepColors = {
  1: "bg-blue-100 text-blue-700 border-blue-200",
  2: "bg-emerald-100 text-emerald-700 border-emerald-200",
  3: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function StepHeader({
  step,
  title,
  description,
}: StepHeaderProps) {
  const Icon = stepIcons[step];
  const colorClass = stepColors[step];

  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-full border ${colorClass}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
          {title}
        </h2>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
  );
}
