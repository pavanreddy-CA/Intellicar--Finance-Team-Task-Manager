import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.email !== "pavanreddy@intellicar.in") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sql = getDb();
    console.log("Running migration for Payments improvements via API...");

    await sql`
      ALTER TABLE "PaymentOccurrence" 
      ADD COLUMN IF NOT EXISTS "isCancelled" BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "cancelledReason" TEXT,
      ADD COLUMN IF NOT EXISTS "deleteRequested" BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "deleteRequestReason" TEXT,
      ADD COLUMN IF NOT EXISTS "deleteRequestedBy" TEXT;
    `;

    return NextResponse.json({ message: "Migration successful" });
  } catch (error: any) {
    console.error("Migration API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
