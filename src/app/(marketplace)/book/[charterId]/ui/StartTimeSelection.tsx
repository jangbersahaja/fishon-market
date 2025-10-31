"use client";

interface StartTimeSelectionProps {
  startTimes?: string[];
  selectedTime?: string;
  onTimeSelect: (time: string) => void;
}

export default function StartTimeSelection({
  startTimes,
  selectedTime,
  onTimeSelect,
}: StartTimeSelectionProps) {
  if (!startTimes || startTimes.length === 0) return null;

  return (
    <section className="pb-5 border-b border-black/10">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold sm:text-lg">
            Select start time
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2 sm:grid-cols-3">
        {startTimes.map((time) => {
          const isSelected = time === selectedTime;
          return (
            <button
              key={time}
              type="button"
              onClick={() => onTimeSelect(time)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                isSelected
                  ? "border-[#ec2227] bg-red-50 text-[#ec2227]"
                  : "border-black/10 hover:border-black/20 text-gray-700"
              }`}
            >
              {time}
            </button>
          );
        })}
      </div>

      {!selectedTime && (
        <p className="mt-3 text-sm text-amber-600">
          Please select a start time to continue
        </p>
      )}
    </section>
  );
}
