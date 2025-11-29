import { prisma } from "@/lib/database/prisma";
import {
  sendBookingApprovedEmail,
  sendBookingRejectedEmail,
} from "@/lib/services/email-service";
import { getTripById } from "@/lib/services/trip-service";
import { NextResponse } from "next/server";

// Captain app will call this to update booking status to APPROVED or REJECTED
// Security: requires header x-captain-secret === CAPTAIN_API_SECRET
export async function POST(req: Request) {
  const secret = process.env.CAPTAIN_API_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 }
    );
  }
  const provided = req.headers.get("x-captain-secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { id, status } = body as { id?: string; status?: string };
  if (!id || (status !== "APPROVED" && status !== "REJECTED")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Only allow transition from PENDING
  const now = new Date();
  const result = await prisma.booking
    .updateMany({
      where: { id, status: "PENDING" },
      data: { status: status as any, captainDecisionAt: now },
    })
    .catch(() => ({ count: 0 }));

  if (!result || result.count === 0) {
    return NextResponse.json(
      { error: "No matching PENDING booking" },
      { status: 409 }
    );
  }

  // Fetch the updated booking for email payloads (best-effort)
  const updated =
    typeof (prisma as any)?.booking?.findUnique === "function"
      ? await (prisma as any).booking
          .findUnique({ where: { id } })
          .catch(() => null)
      : null;

  // Email angler (best-effort)
  try {
    if (updated) {
      const user = await prisma.user.findUnique({
        where: { id: updated.userId },
      });
      if (user?.email) {
        // Get trip data for charter name
        const trip = await getTripById(updated.tripId);
        if (trip) {
          const base =
            process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
          const confirmationUrl = `${base}/book/confirm?id=${encodeURIComponent(
            updated.id
          )}`;
          const isApproved = status === "APPROVED";

          if (isApproved) {
            const paymentUrl = `${base}/book/payment/${encodeURIComponent(
              updated.id
            )}`;
            await sendBookingApprovedEmail({
              to: user.email,
              userName: user.name ?? "there",
              charterName: trip.charter.name,
              tripDate: updated.date.toISOString().slice(0, 10),
              paymentUrl,
              confirmationUrl,
              userId: user.id,
              bookingId: updated.id,
            });
          } else {
            const searchUrl = `${base}/search`;
            await sendBookingRejectedEmail({
              to: user.email,
              userName: user.name ?? "there",
              charterName: trip.charter.name,
              searchUrl,
              userId: user.id,
              bookingId: updated.id,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed to send booking status email:", err);
  }

  return NextResponse.json({ ok: true });
}
