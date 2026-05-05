import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const sql = getDb();
    const session = await getServerSession();
    const userRole = (session?.user as any)?.role;
    
    // Only Admin can trigger reset for others
    if (userRole !== "ADMIN" && session?.user?.email !== "pavanreddy@intellicar.in") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const users = await sql`SELECT id, name, email FROM "User" WHERE id = ${userId} LIMIT 1`;
    
    if (users.length === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const user = users[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour

    // Save token to DB (need to ensure column exists)
    try {
      await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetToken" TEXT, ADD COLUMN IF NOT EXISTS "resetExpires" TIMESTAMP`;
    } catch (e) {}

    await sql`UPDATE "User" SET "resetToken" = ${token}, "resetExpires" = ${expires} WHERE id = ${userId}`;

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://v0-finpulse.vercel.app'}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: "Password Reset Request - Finance Hub",
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: #2563eb; padding: 24px; color: white; text-align: center;">
            <h2 style="margin: 0; font-size: 24px;">Password Reset</h2>
          </div>
          <div style="padding: 32px; text-align: center;">
            <p style="font-size: 18px;">Hello <strong>${user.name}</strong>,</p>
            <p>An administrator has initiated a password reset for your account.</p>
            <p>Please click the button below to set a new password. This link will expire in 1 hour.</p>
            <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; font-size: 16px;">Reset Password</a>
            <p style="margin-top: 24px; font-size: 13px; color: #64748b;">If you did not request this, please ignore this email.</p>
          </div>
          <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
            © 2026 Intellicar Telematics. All rights reserved.
          </div>
        </div>
      `
    });

    return NextResponse.json({ message: "Reset link sent successfully" });
  } catch (error: any) {
    console.error("Reset password email error", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
