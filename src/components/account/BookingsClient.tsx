"use client";

import { BookingCard, EmptyState } from "@/components/account";
import {
  isCancelled,
  isCompleted,
  isInProgress,
  type BookingTab,
} from "@/lib/helpers/booking-status-helpers";
import type { BookingWithDetails } from "@/lib/services/booking-service";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface BookingsClientProps {
  bookings: BookingWithDetails[];
  reviewEligibility: Record<string, boolean>;
}

const tabs: { label: string; value: BookingTab; description: string }[] = [
  {
    label: "In Progress",
    value: "in-progress",
    description: "Pending, approved, and upcoming trips",
  },
  {
    label: "Completed",
    value: "completed",
    description: "Finished trips",
  },
  {
    label: "Cancelled",
    value: "cancelled",
    description: "Rejected, expired, or cancelled bookings",
  },
];

export function BookingsClient({
  bookings,
  reviewEligibility,
}: BookingsClientProps) {
  const [activeTab, setActiveTab] = useState<BookingTab>("in-progress");
  const [searchTerm, setSearchTerm] = useState("");
  const [reviews, setReviews] = useState<
    Map<string, { id: string; overallRating: number }>
  >(new Map());

  // Fetch reviews for completed bookings
  useEffect(() => {
    const completedBookings = bookings.filter(isCompleted);
    if (completedBookings.length === 0) return;

    // Fetch reviews for all completed bookings
    Promise.all(
      completedBookings.map((booking) =>
        fetch(`/api/account/reviews/by-booking/${booking.id}`)
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      const reviewMap = new Map<
        string,
        { id: string; overallRating: number }
      >();
      results.forEach((review, index) => {
        if (review) {
          reviewMap.set(completedBookings[index].id, {
            id: review.id,
            overallRating: review.overallRating,
          });
        }
      });
      setReviews(reviewMap);
    });
  }, [bookings]);

  // Categorize bookings into tabs
  const categorizedBookings = useMemo(() => {
    return {
      "in-progress": bookings.filter(isInProgress),
      completed: bookings.filter(isCompleted),
      cancelled: bookings.filter(isCancelled),
    };
  }, [bookings]);

  // Filter bookings for active tab
  const tabBookings = categorizedBookings[activeTab];

  // Search logic: if searching, group results by tab
  const searchResults = useMemo(() => {
    if (!searchTerm) return null;

    const term = searchTerm.toLowerCase();
    const filterBySearch = (booking: BookingWithDetails) =>
      booking.charterName.toLowerCase().includes(term) ||
      booking.location.toLowerCase().includes(term) ||
      booking.tripName.toLowerCase().includes(term);

    return {
      "in-progress": categorizedBookings["in-progress"].filter(filterBySearch),
      completed: categorizedBookings.completed.filter(filterBySearch),
      cancelled: categorizedBookings.cancelled.filter(filterBySearch),
    };
  }, [searchTerm, categorizedBookings]);

  // Determine what to display
  const displayBookings = searchTerm ? null : tabBookings;
  const hasSearchResults = searchResults
    ? Object.values(searchResults).some((arr) => arr.length > 0)
    : false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your charter bookings and trips
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by charter name, location, or trip..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabs - Hidden when searching */}
      {!searchTerm && (
        <div className="bg-white border border-gray-200 rounded-lg p-1">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const count = categorizedBookings[tab.value].length;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.value
                      ? "bg-[#ec2227] text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>{tab.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        activeTab === tab.value
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Results */}
      {searchTerm ? (
        // Search Results - Grouped by tab
        hasSearchResults ? (
          <div className="space-y-6">
            {(["in-progress", "completed", "cancelled"] as BookingTab[]).map(
              (tabValue) => {
                if (!searchResults) return null; // Type guard
                const results = searchResults[tabValue];
                if (!results || results.length === 0) return null;

                const tab = tabs.find((t) => t.value === tabValue);
                return (
                  <div key={tabValue} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                        {tab?.label}
                      </h3>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                        {results.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {results.map((booking) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          userReview={reviews.get(booking.id) || null}
                          canReview={reviewEligibility[booking.id] || false}
                        />
                      ))}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        ) : (
          <EmptyState
            icon="search"
            title="No bookings found"
            description="Try adjusting your search terms"
          />
        )
      ) : // Tab Results
      displayBookings && displayBookings.length > 0 ? (
        <div className="space-y-4">
          {displayBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              userReview={reviews.get(booking.id) || null}
              canReview={reviewEligibility[booking.id] || false}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="inbox"
          title={`No ${activeTab.replace("-", " ")} bookings`}
          description={
            activeTab === "in-progress"
              ? "Start exploring and book your first fishing charter!"
              : activeTab === "completed"
              ? "You haven't completed any trips yet"
              : "No cancelled bookings"
          }
          action={
            activeTab === "in-progress"
              ? {
                  label: "Browse Charters",
                  href: "/charters",
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
