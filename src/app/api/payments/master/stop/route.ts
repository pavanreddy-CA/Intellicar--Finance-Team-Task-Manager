import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

// POST /api/payments/master/stop
export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, stopDate } = await req.json();

    if (!id || !stopDate) {
      return NextResponse.json({ error: "Missing template ID or stop date" }, { status: 400 });
    }

    const result = await sql`
      UPDATE "PaymentTemplate"
      SET 
        "isStopped" = TRUE,
        "stopDate" = ${new Date(stopDate)},
        "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error("Stop payment template error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
