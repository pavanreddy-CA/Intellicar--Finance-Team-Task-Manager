import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const body = await req.json();
    
    // Support both link-based (token, password) and OTP-based (email, otp, newPassword) flows
    const email = body.email;
    const otp = body.otp || body.token; // Fallback in case token maps to OTP
    const password = body.newPassword || body.password;
    const token = body.token;

    if (email && otp && password) {
      // 1. OTP-based Reset Flow
      const tokens = await sql`
        SELECT * FROM "VerificationToken" 
        WHERE LOWER(identifier) = LOWER(${email}) AND token = ${otp}
        LIMIT 1
      `;

      if (tokens.length === 0) {
        return NextResponse.json({ message: "Invalid OTP" }, { status: 400 });
      }

      if (new Date(tokens[0].expires) < new Date()) {
        return NextResponse.json({ message: "OTP has expired" }, { status: 400 });
      }

      // Check if user exists
      const users = await sql`SELECT id FROM "User" WHERE LOWER(email) = LOWER(${email}) LIMIT 1`;
      if (users.length === 0) {
        return NextResponse.json({ message: "User not found" }, { status: 404 });
      }

      const userId = users[0].id;
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user password
      await sql`
        UPDATE "User" 
        SET password = ${hashedPassword}, 
            "updatedAt" = NOW()
        WHERE id = ${userId}
      `;

      // Clean up verification token
      await sql`DELETE FROM "VerificationToken" WHERE LOWER(identifier) = LOWER(${email})`;

      return NextResponse.json({ message: "Password reset successfully" });
    } else if (token && password) {
      // 2. Link-based Token Flow (Fallback compatibility)
      const users = await sql`
        SELECT id FROM "User" 
        WHERE "resetToken" = ${token} 
        AND "resetExpires" > NOW() 
        LIMIT 1
      `;

      if (users.length === 0) {
        return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 });
      }

      const userId = users[0].id;
      const hashedPassword = await bcrypt.hash(password, 10);

      await sql`
        UPDATE "User" 
        SET password = ${hashedPassword}, 
            "resetToken" = NULL, 
            "resetExpires" = NULL,
            "updatedAt" = NOW()
        WHERE id = ${userId}
      `;

      return NextResponse.json({ message: "Password reset successfully" });
    } else {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Auth reset password error", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
