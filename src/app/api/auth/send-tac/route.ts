import { prisma } from "@/lib/database/prisma";
import { sendVerificationCode } from "@/lib/services/email-service";
import { NextResponse } from "next/server";

// Generate 6-digit TAC
function generateTAC(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email" },
        { status: 404 }
      );
    }

    // Generate TAC
    const code = generateTAC();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store TAC in database (you'll need to create a VerificationCode model)
    await prisma.verificationCode.create({
      data: {
        email,
        code,
        type: "TAC",
        expiresAt,
      },
    });

    // Send email using new email service
    await sendVerificationCode({
      to: email,
      userName: user.name ?? "there",
      code,
      purpose: "login",
      expiryMinutes: 10,
    });

    return NextResponse.json(
      { message: "TAC sent successfully", sentAt: Date.now() },
      { status: 200 }
    );
  } catch (e) {
    console.error("Send TAC error", e);
    return NextResponse.json(
      { error: "Failed to send TAC. Please try again." },
      { status: 500 }
    );
  }
}
