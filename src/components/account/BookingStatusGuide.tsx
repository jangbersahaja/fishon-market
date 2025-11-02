import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  HelpCircle,
  X,
  XCircle,
} from "lucide-react";

const statusGuides = [
  {
    status: "PENDING",
    label: "Pending Review",
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    description: "Your booking request is awaiting captain approval.",
    action: "Wait for captain to review your request within 12 hours.",
  },
  {
    status: "APPROVED",
    label: "Awaiting Payment",
    icon: CreditCard,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "Captain approved your booking!",
    action: "Please make payment to confirm your booking.",
  },
  {
    status: "PAID",
    label: "Confirmed",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    description: "Your booking is confirmed and payment received.",
    action: "Prepare for your trip! Contact captain for details.",
  },
  {
    status: "REJECTED",
    label: "Rejected",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    description: "Captain declined this booking request.",
    action: "Try booking another date or different charter.",
  },
  {
    status: "EXPIRED",
    label: "Expired",
    icon: AlertCircle,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    description: "Captain didn't respond within the time limit.",
    action: "You can try booking again with same or different dates.",
  },
  {
    status: "CANCELLED",
    label: "Cancelled",
    icon: X,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    description: "This booking was cancelled.",
    action: "Feel free to book this or another charter anytime.",
  },
];

export function BookingStatusGuide() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">
          Booking Status Guide
        </h2>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Understand what each booking status means and what actions you should
        take.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statusGuides.map((guide) => {
          const Icon = guide.icon;
          return (
            <div
              key={guide.status}
              className={`${guide.bgColor} ${guide.borderColor} border rounded-lg p-4 space-y-2`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${guide.color}`} />
                <h3 className={`font-semibold ${guide.color}`}>
                  {guide.label}
                </h3>
              </div>
              <p className="text-sm text-gray-700">{guide.description}</p>
              <p className="text-xs text-gray-600 font-medium pt-2 border-t border-gray-200">
                <span className="text-gray-500">What to do:</span>{" "}
                {guide.action}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
