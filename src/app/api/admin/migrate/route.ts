import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  /*
  const session = await getServerSession();
  const isAdmin = session?.user?.email === "pavanreddy@intellicar.in" || (session?.user as any)?.role === "ADMIN";
  
  if (!isAdmin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  */

  const sql = getDb();
  console.log("Migrating database via API...");
  
  try {
    await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "paymentReportFrequency" TEXT DEFAULT 'OFF'`;
    await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "paymentReportTimes" TEXT DEFAULT '10:00'`;
    await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "paymentReportEmail" TEXT DEFAULT 'pavanreddy@intellicar.in'`;
    return NextResponse.json({ message: "Migration successful!" });
  } catch (err: any) {
    console.error("Migration failed:", err);
    return NextResponse.json({ message: "Migration failed", error: err.message }, { status: 500 });
  }
}
