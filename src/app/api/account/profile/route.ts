import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/account/profile
 * Update user profile information
 *
 * Body: {
 *   name: string;
 *   phone?: string;
 *   streetAddress?: string;
 *   city?: string;
 *   state?: string;
 *   postcode?: string;
 *   country?: string;
 *   emergencyName?: string;
 *   emergencyPhone?: string;
 *   emergencyRelation?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      phone,
      streetAddress,
      city,
      state,
      postcode,
      country,
      emergencyName,
      emergencyPhone,
      emergencyRelation,
    } = body;

    // Validate required field
    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Validate phone format if provided
    if (phone && !phone.match(/^\+?[\d\s-()]+$/)) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // Validate postcode format if provided (Malaysian format: 5 digits)
    if (postcode && !postcode.match(/^\d{5}$/)) {
      return NextResponse.json(
        { error: "Invalid postcode format. Use 5 digits (e.g., 47300)" },
        { status: 400 }
      );
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        streetAddress: streetAddress?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        postcode: postcode?.trim() || null,
        country: country?.trim() || null,
        emergencyName: emergencyName?.trim() || null,
        emergencyPhone: emergencyPhone?.trim() || null,
        emergencyRelation: emergencyRelation?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        streetAddress: true,
        city: true,
        state: true,
        postcode: true,
        country: true,
        emergencyName: true,
        emergencyPhone: true,
        emergencyRelation: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
