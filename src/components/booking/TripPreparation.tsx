import { NavigateButtons } from "@/components/account/BookingActionButtons";

interface TripPreparationProps {
  captainPhone?: string | null;
  startingPoint?: string | null;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  bookingId: string;
}

export function TripPreparation({
  captainPhone,
  startingPoint,
  location,
  latitude,
  longitude,
  bookingId,
}: TripPreparationProps) {
  // Don't render if no contact or navigation info available
  // Check for non-empty string (phone could be empty string "" instead of null)
  const hasContactInfo = !!(captainPhone && captainPhone.trim());
  const hasNavigationInfo = !!(startingPoint || latitude);

  if (!hasContactInfo && !hasNavigationInfo) {
    return null;
  }

  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg sm:p-5">
      <h3 className="mb-3 text-lg font-semibold text-gray-900">
        Trip Preparation
      </h3>

      <div className="space-y-3">
        {/* Navigate to Starting Point */}
        {(startingPoint || latitude) && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Navigate to Starting Point
            </p>
            <NavigateButtons
              location={startingPoint || location}
              latitude={latitude}
              longitude={longitude}
            />
          </div>
        )}

        {/* Preparation Tips */}
        <div className="p-4 mt-4 border border-blue-200 rounded-lg bg-blue-50">
          <h4 className="mb-2 text-sm font-semibold text-blue-900">
            Before You Go:
          </h4>
          <ul className="space-y-1 text-xs text-blue-800 list-disc list-inside">
            <li>Arrive 15 minutes before start time</li>
            <li>Bring sunscreen and hat for sun protection</li>
            <li>Wear comfortable non-slip footwear</li>
            <li>Contact captain if running late</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
