// Checkbox list filter component
"use client";

interface CheckboxFilterProps {
  options: { value: string; label: string; count?: number }[];
  selected: string[];
  onChange: (values: string[]) => void;
  maxHeight?: string;
  emptyMessage?: string;
}

export function CheckboxFilter({
  options,
  selected,
  onChange,
  maxHeight = "max-h-64",
  emptyMessage = "No options available",
}: CheckboxFilterProps) {
  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  if (options.length === 0) {
    return <div className="py-2 text-sm text-slate-500">{emptyMessage}</div>;
  }

  return (
    <div className={`overflow-y-auto ${maxHeight} space-y-2`}>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex items-center gap-2.5 py-1.5 cursor-pointer group"
        >
          <input
            type="checkbox"
            checked={selected.includes(option.value)}
            onChange={() => handleToggle(option.value)}
            className="w-4 h-4 rounded text-[#ec2227] border-slate-300 focus:ring-[#ec2227] focus:ring-2 focus:ring-offset-0 transition-all"
          />
          <span className="flex-1 text-sm text-slate-700 group-hover:text-slate-900">
            {option.label}
          </span>
          {option.count !== undefined && (
            <span className="text-xs text-slate-500">({option.count})</span>
          )}
        </label>
      ))}
    </div>
  );
}
