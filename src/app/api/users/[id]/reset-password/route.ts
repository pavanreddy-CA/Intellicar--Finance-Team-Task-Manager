import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const userId = resolvedParams.id;
    const session = await getSession();
    if (!session || session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newPassword } = await req.json();
    if (!newPassword) {
      return NextResponse.json({ error: "New password is required" }, { status: 400 });
    }


    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const sql = getDb();

    const result = await sql`
      UPDATE "User"
      SET password = ${hashedPassword}, "updatedAt" = NOW()
      WHERE id = ${userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error: any) {
    console.error("Admin reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
