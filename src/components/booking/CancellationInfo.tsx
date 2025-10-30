import { AlertCircle } from "lucide-react";

interface CancellationInfoProps {
  cancellationReason?: string | null;
  cancellationSource?: "customer" | "captain";
}

export function CancellationInfo({
  cancellationReason,
  cancellationSource = "customer",
}: CancellationInfoProps) {
  if (!cancellationReason) {
    return null;
  }

  const isCaptainCancellation = cancellationSource === "captain";

  return (
    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
      <div className="flex gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="mb-1 font-semibold text-red-900">
            {isCaptainCancellation
              ? "Cancelled by Captain"
              : "Booking Cancelled"}
          </h4>
          <p className="text-sm text-red-800">{cancellationReason}</p>
          {isCaptainCancellation && (
            <p className="mt-2 text-xs text-red-700">
              If payment was made, a full refund will be processed within 7
              business days.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
