import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, newPassword } = await req.json();
    if (!email || !otp || !newPassword) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const sql = getDb();

    // Verify OTP one last time to be safe
    const tokens = await sql`
      SELECT * FROM "VerificationToken" 
      WHERE LOWER(identifier) = LOWER(${email}) AND token = ${otp}
      LIMIT 1
    `;

    if (tokens.length === 0 || new Date(tokens[0].expires) < new Date()) {
      return NextResponse.json({ message: "Invalid or expired session" }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    const updateResult = await sql`
      UPDATE "User"
      SET password = ${hashedPassword}
      WHERE LOWER(email) = LOWER(${email})
      RETURNING id
    `;

    if (updateResult.length === 0) {
      return NextResponse.json({ message: "User account not found for reset" }, { status: 404 });
    }

    // Delete the used token
    await sql`DELETE FROM "VerificationToken" WHERE LOWER(identifier) = LOWER(${email})`;

    return NextResponse.json({ message: "Password reset successful" }, { status: 200 });
  } catch (error: any) {
    console.error("Reset password error", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
