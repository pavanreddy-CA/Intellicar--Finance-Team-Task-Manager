import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getServerSession } from "@/lib/session";
import bcrypt from "bcrypt";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: "Current and new passwords are required" }, { status: 400 });
    }

    const users = await sql`
      SELECT * FROM "User" WHERE email = ${session.user.email} LIMIT 1
    `;
    const user = users[0];

    if (!user || !user.password) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ message: "Incorrect current password" }, { status: 400 });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await sql`
      UPDATE "User"
      SET password = ${hashedNewPassword}
      WHERE email = ${session.user.email}
    `;

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error: any) {
    console.error("Change password error:", error);
    return NextResponse.json({ message: "Failed to update password", error: error.message }, { status: 500 });
  }
}
