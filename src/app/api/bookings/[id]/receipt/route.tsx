import ReceiptTemplate, {
  type ReceiptTranslations,
} from "@/components/receipt/ReceiptTemplate";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import {
  checkRateLimit,
  getClientIP,
  getRateLimitResetTime,
} from "@/lib/rateLimit";
import {
  enrichBookingWithTripData,
  type EnrichedBooking,
} from "@/lib/services/booking-display-service";
import { renderToStream } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

// Note: With cacheComponents, route segment configs are not needed

// Load translations for PDF generation
async function loadReceiptTranslations(
  locale: string
): Promise<ReceiptTranslations> {
  try {
    // Dynamic import of message files
    const messages =
      locale === "ms"
        ? (await import("../../../../../../messages/ms.json")).default
        : (await import("../../../../../../messages/en.json")).default;

    return messages.booking.receipt as ReceiptTranslations;
  } catch {
    // Fallback to English if locale not found
    const messages = (await import("../../../../../../messages/en.json"))
      .default;
    return messages.booking.receipt as ReceiptTranslations;
  }
}

/**
 * POST /api/bookings/[id]/receipt
 * Generate and download PDF booking confirmation for a PAID booking
 * Requires email verification for security
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { email, locale = "en" } = body as {
      email?: string;
      locale?: string;
    };

    // Fetch booking with user data
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only PAID bookings can generate confirmation
    if (booking.status !== "PAID") {
      return NextResponse.json(
        { error: "Booking confirmation is only available for paid bookings" },
        { status: 400 }
      );
    }

    // Determine booking email
    const bookingEmail = booking.user?.email;
    if (!bookingEmail) {
      return NextResponse.json(
        { error: "No email associated with this booking" },
        { status: 400 }
      );
    }

    // Authorization: Two methods
    // 1. Authenticated user owns the booking
    // 2. Email verification (guest or non-owner)

    const isAuthenticatedOwner =
      session?.user?.id && booking.userId === session.user.id;

    if (!isAuthenticatedOwner) {
      // Email verification required
      if (!email) {
        return NextResponse.json(
          { error: "Email verification required" },
          { status: 403 }
        );
      }

      // Validate email matches booking
      if (email.toLowerCase() !== bookingEmail.toLowerCase()) {
        // Rate limiting for failed attempts
        const clientIP = getClientIP(request);
        const rateLimitKey = `receipt:${id}:${clientIP}`;
        const attempts = checkRateLimit(rateLimitKey, 3600000); // 1 hour window

        if (attempts > 3) {
          const resetTime = getRateLimitResetTime(rateLimitKey);
          const minutesRemaining = Math.ceil(resetTime / 60000);
          return NextResponse.json(
            {
              error: "Too many failed attempts. Please try again later.",
              retryAfter: minutesRemaining,
            },
            { status: 429 }
          );
        }

        return NextResponse.json(
          {
            error: "Email does not match booking email",
            attemptsRemaining: Math.max(0, 3 - attempts),
          },
          { status: 403 }
        );
      }
    }

    // Generate receipt number (format: FISHON-YYYYMM-{last6ofBookingId})
    const receiptNumber = `FISHON-${booking.createdAt.getFullYear()}${(
      booking.createdAt.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-${booking.id.slice(-6).toUpperCase()}`;

    // Enrich booking with trip/charter data
    const enrichedBooking: EnrichedBooking =
      await enrichBookingWithTripData(booking);

    // Load translations for the requested locale
    const translations = await loadReceiptTranslations(locale);

    // Parse discount from JSON
    const discountData = booking.discount as {
      code: string;
      percentage?: number;
      amount: number;
    } | null;

    // Get charter image URL (first image or undefined)
    const charterImage = enrichedBooking.charter?.images?.[0]?.url;

    // Get boat data
    const boatData = enrichedBooking.charter?.boat
      ? {
          name: enrichedBooking.charter.boat.name,
          type: enrichedBooking.charter.boat.type || "Fishing Boat",
          capacity: enrichedBooking.charter.boat.capacity,
          features: enrichedBooking.charter?.features || [],
        }
      : undefined;

    // Get captain data
    const captainData = enrichedBooking.charter?.captain
      ? {
          name: enrichedBooking.charter.captain.displayName,
          phone: enrichedBooking.charter.captain.phone,
        }
      : undefined;

    // Get amenities (what's included)
    const amenities =
      enrichedBooking.charter?.includes
        ?.filter((item) => item.isIncluded)
        .map((item) => item.name) || [];

    // Get meeting point
    const meetingPoint = enrichedBooking.charter?.startingPoint;

    // Prepare receipt data with enhanced information
    const receiptData = {
      booking: {
        id: enrichedBooking.id,
        charterName: enrichedBooking.charterName,
        location: enrichedBooking.location,
        tripName: enrichedBooking.tripName,
        date: enrichedBooking.date,
        days: enrichedBooking.days,
        adults: enrichedBooking.adults,
        children: enrichedBooking.children,
        startTime: enrichedBooking.startTime,
        durationHour: enrichedBooking.durationHour,
        unitPrice: enrichedBooking.unitPrice,
        subtotal: enrichedBooking.subtotal,
        totalPrice: enrichedBooking.totalPrice,
        serviceFee: enrichedBooking.serviceFee,
        platformFee: enrichedBooking.platformFee,
        paidAt: enrichedBooking.paidAt,
        createdAt: enrichedBooking.createdAt,
        // Additional data for enhanced receipt
        emergencyContact: enrichedBooking.emergencyContact,
        participants: enrichedBooking.participants,
        discount: discountData,
        // New fields to match desktop view
        charterImage,
        boat: boatData,
        captain: captainData,
        meetingPoint,
        amenities,
      },
      user: {
        name: booking.user?.name || translations.guest,
        email: booking.user?.email || "",
        phone: booking.user?.phone || "",
      },
      receiptNumber,
    };

    // Generate PDF stream with translations
    const pdfStream = await renderToStream(
      <ReceiptTemplate
        data={receiptData}
        translations={translations}
        locale={locale}
      />
    );

    // Convert to Node.js readable stream
    const nodeStream = Readable.from(pdfStream as any);

    // Create a Response with the stream
    const chunks: Buffer[] = [];
    for await (const chunk of nodeStream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Return PDF with proper headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Fishon-Booking-Confirmation-${receiptNumber}.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error generating booking confirmation:", error);
    return NextResponse.json(
      { error: "Failed to generate booking confirmation" },
      { status: 500 }
    );
  }
}
