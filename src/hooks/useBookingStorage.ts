/**
 * useBookingStorage Hook
 *
 * Enables guest users to track their bookings via localStorage.
 * Bookings are stored for 30 days and automatically cleaned up.
 *
 * @example
 * ```tsx
 * const { addBooking, getBookings, removeBooking } = useBookingStorage();
 *
 * // After successful booking
 * addBooking({
 *   id: 'booking-123',
 *   charterName: 'Deep Sea Adventure',
 *   date: '2025-11-15',
 *   status: 'PENDING',
 * });
 *
 * // Get all bookings
 * const myBookings = getBookings();
 * ```
 */

import { useEffect, useState } from "react";

const STORAGE_KEY = "fishon_guest_bookings";
const EXPIRY_DAYS = 30;
const EXPIRY_MS = EXPIRY_DAYS * 24 * 60 * 60 * 1000;

export interface BookingReference {
  id: string;
  charterName: string;
  date: string; // ISO date string
  status: string;
  createdAt: number; // timestamp
}

interface StoredData {
  bookings: BookingReference[];
  lastCleanup: number;
}

/**
 * Get storage data from localStorage
 */
function getStorageData(): StoredData {
  if (typeof window === "undefined") {
    return { bookings: [], lastCleanup: Date.now() };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { bookings: [], lastCleanup: Date.now() };
    }

    const data = JSON.parse(raw) as StoredData;
    return {
      bookings: Array.isArray(data.bookings) ? data.bookings : [],
      lastCleanup: data.lastCleanup || Date.now(),
    };
  } catch (error) {
    console.error("Failed to parse booking storage:", error);
    return { bookings: [], lastCleanup: Date.now() };
  }
}

/**
 * Save storage data to localStorage
 */
function setStorageData(data: StoredData): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save booking storage:", error);
  }
}

/**
 * Remove expired bookings (older than 30 days)
 */
function cleanupExpiredBookings(
  bookings: BookingReference[]
): BookingReference[] {
  const now = Date.now();
  return bookings.filter((booking) => now - booking.createdAt < EXPIRY_MS);
}

/**
 * Hook for managing guest bookings in localStorage
 */
export function useBookingStorage() {
  const [bookings, setBookings] = useState<BookingReference[]>([]);

  // Load bookings on mount and cleanup if needed
  useEffect(() => {
    const data = getStorageData();
    const now = Date.now();

    // Cleanup every 24 hours
    const shouldCleanup = now - data.lastCleanup > 24 * 60 * 60 * 1000;

    if (shouldCleanup) {
      const cleaned = cleanupExpiredBookings(data.bookings);
      setStorageData({ bookings: cleaned, lastCleanup: now });
      setBookings(cleaned);
    } else {
      setBookings(data.bookings);
    }
  }, []);

  /**
   * Add a new booking to storage
   */
  const addBooking = (booking: Omit<BookingReference, "createdAt">) => {
    const data = getStorageData();

    // Check if booking already exists
    const exists = data.bookings.some((b) => b.id === booking.id);
    if (exists) {
      console.warn(`Booking ${booking.id} already exists in storage`);
      return;
    }

    const newBooking: BookingReference = {
      ...booking,
      createdAt: Date.now(),
    };

    const updated = [...data.bookings, newBooking];
    setStorageData({ ...data, bookings: updated });
    setBookings(updated);
  };

  /**
   * Get all bookings (non-expired)
   */
  const getBookings = (): BookingReference[] => {
    return cleanupExpiredBookings(bookings);
  };

  /**
   * Remove a specific booking
   */
  const removeBooking = (id: string) => {
    const data = getStorageData();
    const filtered = data.bookings.filter((b) => b.id !== id);
    setStorageData({ ...data, bookings: filtered });
    setBookings(filtered);
  };

  /**
   * Update booking status (e.g., from PENDING to APPROVED)
   */
  const updateBookingStatus = (id: string, status: string) => {
    const data = getStorageData();
    const updated = data.bookings.map((b) =>
      b.id === id ? { ...b, status } : b
    );
    setStorageData({ ...data, bookings: updated });
    setBookings(updated);
  };

  /**
   * Clear all bookings (for testing or user request)
   */
  const clearAll = () => {
    setStorageData({ bookings: [], lastCleanup: Date.now() });
    setBookings([]);
  };

  /**
   * Manual cleanup of expired bookings
   */
  const cleanup = () => {
    const data = getStorageData();
    const cleaned = cleanupExpiredBookings(data.bookings);
    setStorageData({ bookings: cleaned, lastCleanup: Date.now() });
    setBookings(cleaned);
  };

  return {
    bookings: getBookings(),
    addBooking,
    getBookings,
    removeBooking,
    updateBookingStatus,
    clearAll,
    cleanup,
  };
}
