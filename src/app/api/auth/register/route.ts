import { prisma } from "@/lib/database/prisma";
import { upgradeGuestToAngler } from "@/lib/services/guest-user-service";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(body?.password || "");
    const name = body?.name ? String(body.name).trim() : undefined;
    const phone = body?.phone ? String(body.phone).trim() : undefined;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // If GUEST user, upgrade to ANGLER
      if (existing.role === "GUEST") {
        const passwordHash = await bcrypt.hash(password, 10);
        const upgraded = await upgradeGuestToAngler({
          email,
          passwordHash,
          name: name || existing.name || undefined,
          phone: phone || existing.phone || undefined,
        });

        // Return user data with upgraded flag
        const user = await prisma.user.findUnique({
          where: { id: upgraded.id },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
          },
        });

        return NextResponse.json(
          {
            user,
            upgraded: true,
            message:
              "Account upgraded successfully! Your previous bookings are now linked to your account.",
          },
          { status: 200 }
        );
      }

      // Already a registered user (ANGLER/ADMIN)
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Create new user
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name,
        phone,
        // role defaults to ANGLER via Prisma schema
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    console.error("Register error", e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
