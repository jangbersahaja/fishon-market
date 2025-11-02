import { prisma } from "@/lib/database/prisma";
import { NextResponse } from "next/server";

//TODO: Add notification emails to captain and angler when booking expires
//TODO: Email reminder to captain X hours before booking expiry
//TODO: Send webhook notification when booking expires

// Simple expiry endpoint to be called by a scheduler (e.g., cron) with a secret header
// Marks PENDING bookings as EXPIRED when expiresAt < now
export async function POST(req: Request) {
  const secret = process.env.BOOKINGS_EXPIRE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 }
    );
  }
  const provided = req.headers.get("x-expire-secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Update many in one go; return count
  const result = await prisma.booking.updateMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  return NextResponse.json({ expired: result.count }, { status: 200 });
}

// Vercel Cron issues GET requests. Support GET with the same security, allowing a `secret` query param
// or the same `x-expire-secret` header. Prefer header when available.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const provided =
    req.headers.get("x-expire-secret") || url.searchParams.get("secret");
  const secret = process.env.BOOKINGS_EXPIRE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 }
    );
  }
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const result = await prisma.booking.updateMany({
    where: { status: "PENDING", expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });
  return NextResponse.json({ expired: result.count }, { status: 200 });
}
