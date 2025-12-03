import ReceiptTemplate, {
  type ReceiptTranslations,
} from "@/components/receipt/ReceiptTemplate";
import { renderToStream } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only allow in development
const isDev = process.env.NODE_ENV === "development";

// Load translations for PDF generation
async function loadReceiptTranslations(
  locale: string
): Promise<ReceiptTranslations> {
  try {
    const messages =
      locale === "ms"
        ? (await import("../../../../../messages/ms.json")).default
        : (await import("../../../../../messages/en.json")).default;

    return messages.booking.receipt as ReceiptTranslations;
  } catch {
    const messages = (await import("../../../../../messages/en.json")).default;
    return messages.booking.receipt as ReceiptTranslations;
  }
}

/**
 * POST /api/dev/receipt-test
 * Generate a sample PDF receipt for testing (dev only)
 */
export async function POST(request: NextRequest) {
  if (!isDev) {
    return NextResponse.json(
      { error: "This endpoint is only available in development" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const {
      locale = "en",
      withDiscount = false,
      withEmergencyContact = true,
    } = body as {
      locale?: string;
      withDiscount?: boolean;
      withEmergencyContact?: boolean;
    };

    // Load translations
    const translations = await loadReceiptTranslations(locale);

    // Generate sample receipt number
    const now = new Date();
    const receiptNumber = `FISHON-${now.getFullYear()}${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-SAMPLE`;

    // Sample booking data with all the new fields
    const subtotal = 1500; // unitPrice * days
    const serviceFee = 45; // Payment gateway fee (3%)
    const discountAmount = withDiscount ? 150 : 0;
    const totalPrice = subtotal - discountAmount + serviceFee;

    const sampleData = {
      booking: {
        id: "sample-booking-123456",
        charterName: "Sunrise Fishing Charter",
        location: "Kuala Terengganu, Terengganu",
        tripName: "Full Day Deep Sea Fishing",
        date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        days: 1,
        adults: 4,
        children: 1,
        startTime: "06:00",
        durationHour: 8,
        unitPrice: 1500,
        subtotal: subtotal,
        serviceFee: serviceFee,
        totalPrice: totalPrice,
        paidAt: now,
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        emergencyContact: withEmergencyContact
          ? {
              name: "Ahmad bin Hassan",
              phone: "+60 12-345 6789",
              relationship: "Spouse",
            }
          : undefined,
        participants: [
          { name: "John Doe", phone: "+60 19-876 5432", isBooker: true },
          { name: "Jane Doe", phone: "+60 19-876 5433", isBooker: false },
          { name: "Ali bin Abu", phone: "+60 11-234 5678", isBooker: false },
          { name: "Siti binti Rahman", phone: "", isBooker: false },
        ],
        discount: withDiscount
          ? {
              code: "FISHING10",
              percentage: 10,
              amount: 150,
            }
          : null,
        // New fields to match desktop view
        charterImage:
          "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800",
        boat: {
          name: "Sea Hunter II",
          type: "Sport Fishing Boat",
          length: 32,
          capacity: 8,
          features: ["GPS", "Fish Finder", "Live Bait Tank", "Sun Canopy"],
        },
        captain: {
          name: "Kapten Ahmad",
          experience: 15,
          phone: "+60 12-999 8888",
        },
        meetingPoint: "Jeti Nelayan Kuala Terengganu, Jalan Pantai",
        amenities: [
          "Fishing Rods",
          "Bait & Tackle",
          "Ice Box",
          "Life Jackets",
          "Drinking Water",
          "First Aid Kit",
        ],
      },
      user: {
        name: "John Doe",
        email: "john.doe@example.com",
        phone: "+60 19-876 5432",
      },
      receiptNumber,
    };

    // Generate PDF
    const pdfStream = await renderToStream(
      <ReceiptTemplate
        data={sampleData}
        translations={translations}
        locale={locale}
      />
    );

    // Convert to buffer
    const nodeStream = Readable.from(pdfStream as any);
    const chunks: Buffer[] = [];
    for await (const chunk of nodeStream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Return PDF
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Sample-Receipt-${locale.toUpperCase()}.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating sample receipt:", error);
    return NextResponse.json(
      { error: "Failed to generate sample receipt", details: String(error) },
      { status: 500 }
    );
  }
}
