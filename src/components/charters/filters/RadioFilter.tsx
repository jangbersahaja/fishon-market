// Radio button filter component
"use client";

interface RadioFilterProps {
  options: { value: string; label: string; description?: string }[];
  selected: string;
  onChange: (value: string) => void;
  name: string;
}

export function RadioFilter({
  options,
  selected,
  onChange,
  name,
}: RadioFilterProps) {
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex items-start gap-2.5 py-1.5 cursor-pointer group"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={selected === option.value}
            onChange={() => onChange(option.value)}
            className="mt-0.5 w-4 h-4 text-[#ec2227] border-slate-300 focus:ring-[#ec2227] focus:ring-2 focus:ring-offset-0 transition-all"
          />
          <div className="flex-1">
            <span className="text-sm text-slate-700 group-hover:text-slate-900">
              {option.label}
            </span>
            {option.description && (
              <p className="mt-0.5 text-xs text-slate-500">
                {option.description}
              </p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}
