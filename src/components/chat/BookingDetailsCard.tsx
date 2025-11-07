"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";

export interface BookingDetailsCardProps {
  booking: {
    id: string;
    charterName: string;
    date: string;
    days: number;
    guests: number;
    totalPrice: number;
    status?: string;
  };
  captainContact?: {
    name: string;
    phone?: string;
    email?: string;
  };
  isExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
}

/**
 * BookingDetailsCard Component
 *
 * Shows booking information in the chat header
 * Can be collapsed/expanded
 * Displays captain/angler contact info
 */
export function BookingDetailsCard({
  booking,
  captainContact,
  isExpanded = true,
  onToggle,
}: BookingDetailsCardProps) {
  return (
    <Card className="m-4 border-blue-200 bg-blue-50">
      <button
        onClick={() => onToggle?.(!isExpanded)}
        className="w-full px-4 py-3 flex justify-between items-center hover:bg-blue-100 transition"
      >
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-blue-900">{booking.charterName}</h3>
          <p className="text-sm text-blue-700">
            {new Date(booking.date).toLocaleDateString()} • {booking.days} days
            • {booking.guests} guests
          </p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-blue-700 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-blue-200 pt-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-blue-900 mb-1">
              Total Price
            </p>
            <p className="text-lg font-bold text-blue-900">
              RM {booking.totalPrice.toFixed(2)}
            </p>
          </div>

          {captainContact && (
            <div>
              <p className="text-xs font-semibold text-blue-900 mb-2">
                Contact Information
              </p>
              <div className="space-y-2">
                {captainContact.name && (
                  <p className="text-sm text-blue-800">{captainContact.name}</p>
                )}
                {captainContact.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700">
                      {captainContact.phone}
                    </span>
                    <Button variant="outline" size="sm" className="text-xs">
                      Call
                    </Button>
                  </div>
                )}
                {captainContact.email && (
                  <p className="text-sm text-blue-800">
                    {captainContact.email}
                  </p>
                )}
              </div>
            </div>
          )}

          <Button variant="outline" className="w-full text-xs">
            View Full Details
          </Button>
        </div>
      )}
    </Card>
  );
}
