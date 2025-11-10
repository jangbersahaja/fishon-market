"use client";

import { Button } from "@/components/ui/button";
import { convert24to12Hour } from "@/lib/helpers/booking-helpers";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Mail,
  Phone,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface ChatHeaderProps {
  otherUserName: string;
  otherUserAvatar?: string | null;
  isOnline?: boolean;
  onBack?: () => void;
  booking?: {
    id: string;
    charterName: string;
    tripName: string;
    tripDurationHours: number;
    date: string;
    days: number;
    adults: number;
    children: number;
    totalPrice: number;
    startTime?: string;
    status: string;
  };
  captainContact?: {
    email: string;
    phone: string;
  };
}

/**
 * ChatHeader Component
 *
 * Top bar of chat interface with back button, user info, and booking details
 */
export function ChatHeader({
  otherUserName,
  otherUserAvatar,
  isOnline = false,
  onBack,
  booking,
  captainContact,
}: ChatHeaderProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Status badge color
  const statusColor = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    APPROVED: "bg-blue-100 text-blue-800 border-blue-200",
    PAID: "bg-green-100 text-green-800 border-green-200",
    COMPLETED: "bg-gray-100 text-gray-800 border-gray-200",
    REJECTED: "bg-red-100 text-red-800 border-red-200",
    CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
    EXPIRED: "bg-gray-100 text-gray-800 border-gray-200",
  }[booking?.status || "PENDING"];

  return (
    <div className="bg-white">
      {/* Main Header */}
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center flex-1 min-w-0 gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {otherUserAvatar ? (
            <Image
              src={otherUserAvatar}
              alt={`${otherUserName}'s avatar`}
              width={40}
              height={40}
              className="flex-shrink-0 rounded-full"
            />
          ) : (
            <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 text-sm font-semibold text-gray-600 bg-gray-300 rounded-full">
              {otherUserName[0]?.toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 truncate">
              {otherUserName}
            </h2>
            {booking && (
              <p className="text-xs text-gray-500 truncate">
                {booking.charterName}
                {isOnline && (
                  <span className="inline-flex items-center gap-1 ml-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Online
                  </span>
                )}
              </p>
            )}
            {!booking && (
              <p className="text-xs text-gray-500">
                {isOnline ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Online
                  </span>
                ) : (
                  "Away"
                )}
              </p>
            )}
          </div>
        </div>

        {booking && (
          <>
            <div
              className={`${statusColor} capitalize px-4 mr-2 rounded-lg py-2 text-sm font-semibold border text-center hidden md:flex`}
            >
              <span>{booking.status?.toLowerCase()}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDetails(!showDetails)}
              className="flex-shrink-0"
            >
              <ChevronDown
                className={`w-5 h-5 transition-transform ${showDetails ? "rotate-180" : ""}`}
              />
            </Button>
          </>
        )}
      </div>

      {/* Booking Details Dropdown */}
      {booking && showDetails && (
        <div className="px-4 py-4 space-y-4 border-t border-gray-200 bg-gradient-to-br from-white to-gray-100">
          {/* Trip Details */}
          <p className="text-xs font-semibold text-gray-700 uppercase">
            Trip Details
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex items-start gap-2">
              <Calendar className="text-slate-400 mt-0.5 flex-shrink-0 w-4 h-4" />
              <div className="min-w-0">
                <div className="text-xs text-slate-500">Date</div>
                <div className="text-sm font-medium text-slate-900">
                  <span>
                    {new Date(booking.date).toLocaleDateString("en-MY", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {booking.days > 1 && (
                    <span>
                      {" - "}
                      {new Date(
                        new Date(booking.date).getTime() +
                          booking.days * 24 * 60 * 60 * 1000
                      ).toLocaleDateString("en-MY", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600">
                  {booking.days} day{booking.days !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="text-slate-400 mt-0.5 flex-shrink-0 w-4 h-4" />
              <div className="min-w-0">
                <div className="text-xs text-slate-500">Duration</div>
                <div className="text-sm font-medium text-slate-900">
                  {booking.tripDurationHours}{" "}
                  {booking.tripDurationHours === 1 ? "hour" : "hours"}
                  {booking.startTime && (
                    <span> - Starting at {convert24to12Hour(booking.startTime)}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Users className="text-slate-400 mt-0.5 flex-shrink-0 w-4 h-4" />
              <div className="min-w-0">
                <div className="text-xs text-slate-500">Guests</div>
                <div className="text-sm font-medium text-slate-900">
                  {booking.adults} adult{booking.adults !== 1 ? "s" : ""}
                  {booking.children > 0 &&
                    `, ${booking.children} child${booking.children !== 1 ? "ren" : ""}`}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CircleDollarSign className="text-slate-400 mt-0.5 flex-shrink-0 w-4 h-4" />
              <div className="min-w-0">
                <div className="text-xs text-slate-500">Total Price</div>
                <div className="text-sm font-semibold text-slate-900">
                  RM {booking.totalPrice.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Captain Contact */}
          {booking.status === "PAID" && captainContact && (
            <div className="pt-4 border-t border-gray-200">
              <p className="mb-2 text-xs font-semibold text-gray-700 uppercase">
                Captain Contact
              </p>
              <div className="space-y-2">
                {captainContact.phone && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm text-gray-700">
                      <Phone className="w-4 h-4" />
                      {captainContact.phone}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      asChild
                    >
                      <a href={`tel:${captainContact.phone}`}>Call</a>
                    </Button>
                  </div>
                )}
                {captainContact.email && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm text-gray-700 truncate">
                      <Mail className="flex-shrink-0 w-4 h-4" />
                      <span className="truncate">{captainContact.email}</span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0 text-xs"
                      asChild
                    >
                      <a href={`mailto:${captainContact.email}`}>Email</a>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile Status Badge + View Booking Link */}
      {booking && (
        <div className="flex flex-col w-full">
          <div
            className={`${statusColor} capitalize px-4 py-2 text-sm font-semibold border-t justify-center w-full flex md:hidden`}
          >
            <span className="text-center">{booking.status?.toLowerCase()}</span>
          </div>
          <Link
            href={`/account/bookings/${booking.id}`}
            className="inline-flex items-center justify-center flex-1 px-4 py-2 text-sm font-medium text-gray-700 transition-colors bg-white border-t border-gray-200 hover:bg-gray-50"
            prefetch={false}
          >
            View Full Booking Details
          </Link>
        </div>
      )}
    </div>
  );
}
