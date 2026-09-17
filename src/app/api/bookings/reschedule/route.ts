import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { prismaCaptain } from "@/lib/database/prisma-captain";
import { sendMail } from "@/lib/helpers/email";
import { sendWithRetry } from "@/lib/webhooks/webhook";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

function isStaffOrAdmin(role?: string | null) {
  return role === "STAFF" || role === "ADMIN";
}

function hasCaptainSecret(req: Request) {
  const header = req.headers.get("x-captain-api-secret");
  const secret = process.env.CAPTAIN_API_SECRET;
  return Boolean(secret && header && header === secret);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmail({
  heading,
  name,
  charterName,
  tripName,
  newDate,
  finalPrice,
  reason,
  role,
  anglerName,
  anglerEmail,
}: {
  heading: string;
  name: string;
  charterName: string;
  tripName: string;
  newDate: string;
  finalPrice: string;
  reason: string;
  role: "angler" | "captain";
  anglerName?: string;
  anglerEmail?: string;
}) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h2 style="color:#0f766e">${escapeHtml(heading)}</h2>
  <p>Hi ${escapeHtml(name)},</p>
  <p>Your booking details have been updated by the Fishon admin team.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600">Charter</td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(charterName)}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600">Trip</td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(tripName)}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600">New Date</td><td style="padding:8px;border:1px solid #e2e8f0;color:#0f766e;font-weight:600">${escapeHtml(newDate)}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600">Amount</td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(finalPrice)}</td></tr>
    ${role === "captain" && anglerName ? `<tr><td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600">Angler</td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(anglerName)}${anglerEmail ? ` (${escapeHtml(anglerEmail)})` : ""}</td></tr>` : ""}
    <tr><td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600">Reason</td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(reason)}</td></tr>
  </table>
  <p style="color:#64748b;font-size:14px">If you have any questions, please contact the Fishon support team.</p>
  <p style="color:#64748b;font-size:14px">— Fishon Admin</p>
</body></html>`;
}

export async function POST(req: Request) {
  const authorizedBySecret = hasCaptainSecret(req);
  if (!authorizedBySecret) {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!isStaffOrAdmin(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const { id, date: dateStr, reason } = body as {
    id?: string;
    date?: string;
    reason?: string;
  };

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!dateStr) return NextResponse.json({ error: "date required (YYYY-MM-DD)" }, { status: 400 });

  const newDate = new Date(dateStr);
  if (isNaN(newDate.getTime()))
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.status !== "PAID")
    return NextResponse.json(
      { error: `Only PAID bookings can be rescheduled (current: ${booking.status})` },
      { status: 409 }
    );

  // Shift timeSlots by the same delta as the date change
  let newTimeSlots = booking.timeSlots;
  if (Array.isArray(booking.timeSlots) && booking.timeSlots.length > 0) {
    const slots = booking.timeSlots as Array<{
      day?: number;
      date?: string;
      startDateTime: string;
      endDateTime: string;
    }>;
    const oldDate = new Date(slots[0].startDateTime);
    const oldMidnight = new Date(
      Date.UTC(oldDate.getUTCFullYear(), oldDate.getUTCMonth(), oldDate.getUTCDate())
    );
    const newMidnight = new Date(
      Date.UTC(newDate.getUTCFullYear(), newDate.getUTCMonth(), newDate.getUTCDate())
    );
    const deltaMs = newMidnight.getTime() - oldMidnight.getTime();
    newTimeSlots = slots.map((slot) => ({
      ...slot,
      date: newDate.toISOString().split("T")[0],
      startDateTime: new Date(new Date(slot.startDateTime).getTime() + deltaMs).toISOString(),
      endDateTime: new Date(new Date(slot.endDateTime).getTime() + deltaMs).toISOString(),
    }));
  }

  await prisma.booking.update({
    where: { id },
    data: { date: newDate, timeSlots: newTimeSlots ?? undefined },
  });

  const tripDateStr = newDate.toISOString().split("T")[0];

  // Enrich from captain DB via $queryRaw (prismaCaptain uses market schema — no ORM models for Charter/Trip)
  const [charterRows, tripRows] = await Promise.all([
    prismaCaptain.$queryRaw<
      Array<{ name: string; captainDisplayName: string | null; captainEmail: string | null }>
    >`
      SELECT c.name, cp."displayName" as "captainDisplayName", u.email as "captainEmail"
      FROM "Charter" c
      LEFT JOIN "CaptainProfile" cp ON c."captainId" = cp.id
      LEFT JOIN "User" u ON cp."userId" = u.id
      WHERE c.id = ${booking.charterId}
    `,
    prismaCaptain.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM "Trip" WHERE id = ${booking.tripId}
    `,
  ]);

  const charterName = charterRows[0]?.name ?? "Charter";
  const captainName = charterRows[0]?.captainDisplayName ?? "Captain";
  const captainEmail = charterRows[0]?.captainEmail ?? null;
  const tripName = tripRows[0]?.name ?? "Trip";
  const anglerName = booking.user?.name ?? "Angler";
  const anglerEmail = booking.user?.email ?? null;
  const finalPrice = `RM ${Number(booking.finalPrice).toFixed(2)}`;
  const reasonText = reason || "Admin rescheduled your booking";

  const emailLog: { to: string; status: string; error?: string }[] = [];

  // Email angler
  if (anglerEmail) {
    try {
      await sendMail({
        to: anglerEmail,
        subject: `Booking Rescheduled – ${charterName}`,
        html: buildEmail({
          heading: "Your booking has been rescheduled",
          name: anglerName,
          charterName,
          tripName,
          newDate: tripDateStr,
          finalPrice,
          reason: reasonText,
          role: "angler",
        }),
        emailType: "OTHER",
        bookingId: id,
        userId: booking.userId ?? undefined,
      });
      emailLog.push({ to: anglerEmail, status: "sent" });
      process.stdout.write(`[reschedule] angler email sent → ${anglerEmail}\n`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      emailLog.push({ to: anglerEmail, status: "failed", error: msg });
      process.stdout.write(`[reschedule] angler email failed → ${msg}\n`);
    }
  } else {
    process.stdout.write(`[reschedule] skipped angler email — no email on booking ${id}\n`);
  }

  // Email captain
  if (captainEmail) {
    try {
      await sendMail({
        to: captainEmail,
        subject: `Booking Rescheduled – ${charterName}`,
        html: buildEmail({
          heading: "A booking has been rescheduled",
          name: captainName,
          charterName,
          tripName,
          newDate: tripDateStr,
          finalPrice,
          reason: reasonText,
          role: "captain",
          anglerName,
          anglerEmail: anglerEmail ?? undefined,
        }),
        emailType: "OTHER",
        bookingId: id,
      });
      emailLog.push({ to: captainEmail, status: "sent" });
      process.stdout.write(`[reschedule] captain email sent → ${captainEmail}\n`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      emailLog.push({ to: captainEmail, status: "failed", error: msg });
      process.stdout.write(`[reschedule] captain email failed → ${msg}\n`);
    }
  } else {
    process.stdout.write(`[reschedule] skipped captain email — no email for charter ${booking.charterId}\n`);
  }

  process.stdout.write(`[reschedule] done bookingId=${id} newDate=${tripDateStr} emails=${emailLog.length}\n`);

  // Fire captain webhook to bust cache
  const hookUrl = process.env.CAPTAIN_WEBHOOK_URL;
  const hookSecret = process.env.CAPTAIN_API_SECRET;
  if (hookUrl && hookSecret) {
    sendWithRetry(
      hookUrl,
      {
        type: "booking.rescheduled",
        booking: {
          id,
          tripId: booking.tripId,
          charterId: booking.charterId,
          status: booking.status,
          date: newDate.toISOString(),
          charterName,
        },
      },
      { headers: { "x-captain-secret": hookSecret }, attempts: 3, baseDelayMs: 300 }
    );
  }

  // Revalidate angler account pages
  revalidatePath("/ms/account/bookings", "page");
  revalidatePath("/en/account/bookings", "page");

  return NextResponse.json({ ok: true, newDate: tripDateStr, emails: emailLog });
}
