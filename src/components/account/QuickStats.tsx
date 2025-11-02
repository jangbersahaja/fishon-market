import { Calendar, CheckCircle2, Clock, TrendingUp } from "lucide-react";

interface QuickStatsProps {
  stats: {
    total: number;
    pending: number;
    approved: number;
    paid: number;
  };
}

export function QuickStats({ stats }: QuickStatsProps) {
  const statItems = [
    {
      label: "Total Bookings",
      value: stats.total,
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Pending Review",
      value: stats.pending,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Awaiting Payment",
      value: stats.approved,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Confirmed Trips",
      value: stats.paid,
      icon: CheckCircle2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item, index) => (
        <div
          key={index}
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                {item.label}
              </p>
              <p className="text-3xl font-bold text-gray-900">{item.value}</p>
            </div>
            <div className={`p-3 rounded-full ${item.bgColor}`}>
              <item.icon className={`w-6 h-6 ${item.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
