import { prisma } from "@/lib/database/prisma";
import { connection, NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/account-type?email=...
 * Checks if an email is registered and whether it's OAuth-only
 */
export async function GET(request: NextRequest) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json({ exists: false, oauthOnly: false });
    }

    // If user exists but has no password, they're OAuth-only
    const oauthOnly = !user.passwordHash || user.passwordHash.length === 0;

    return NextResponse.json({ exists: true, oauthOnly });
  } catch (error) {
    console.error("Error checking account type:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
