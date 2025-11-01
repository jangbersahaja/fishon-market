// Range slider filter component
"use client";

import { useEffect, useState } from "react";

interface RangeFilterProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  step?: number;
  formatLabel?: (value: number) => string;
  unit?: string;
}

export function RangeFilter({
  min,
  max,
  value,
  onChange,
  step = 1,
  formatLabel,
  unit = "",
}: RangeFilterProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleMinChange = (newMin: number) => {
    const clampedMin = Math.min(newMin, localValue[1]);
    const newValue: [number, number] = [clampedMin, localValue[1]];
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleMaxChange = (newMax: number) => {
    const clampedMax = Math.max(newMax, localValue[0]);
    const newValue: [number, number] = [localValue[0], clampedMax];
    setLocalValue(newValue);
    onChange(newValue);
  };

  const displayValue = (val: number) =>
    formatLabel ? formatLabel(val) : `${val}${unit}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-900">
          {displayValue(localValue[0])}
        </span>
        <span className="text-slate-400">—</span>
        <span className="font-medium text-slate-900">
          {displayValue(localValue[1])}
        </span>
      </div>
      <div className="space-y-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue[0]}
          onChange={(e) => handleMinChange(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider-thumb-red"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue[1]}
          onChange={(e) => handleMaxChange(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider-thumb-red"
        />
      </div>
    </div>
  );
}
