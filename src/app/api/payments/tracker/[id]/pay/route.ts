import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

// POST /api/payments/tracker/[id]/pay
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sql = getDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session?.user as any)?.role;
    if (userRole === "VIEWER") {
      return NextResponse.json({ error: "Forbidden: Viewers cannot record payments" }, { status: 403 });
    }

    const { actualDate, amountPaid } = await req.json();

    if (!actualDate || !amountPaid) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }

    const result = await sql`
      UPDATE "PaymentOccurrence"
      SET 
        "actualDate" = ${new Date(actualDate)},
        "amountPaid" = ${Number(amountPaid)},
        "isPaid" = TRUE,
        "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error("Mark as paid error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
