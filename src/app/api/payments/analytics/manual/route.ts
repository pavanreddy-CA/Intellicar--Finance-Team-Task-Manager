import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET /api/payments/analytics/manual
export async function GET() {
  try {
    const sql = getDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entries = await sql`
      SELECT * FROM payments_analytics_manual
      ORDER BY payment_date DESC
    `;
    return NextResponse.json(entries);
  } catch (error: any) {
    console.error("Fetch manual analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/payments/analytics/manual
export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { entityName, paymentType, frequency, amount, status, transactionCount, paymentDate } = body;

    if (!entityName || !paymentType || !amount || !status || !paymentDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const inserted = await sql`
      INSERT INTO payments_analytics_manual (
        entity_name, payment_type, frequency, amount, status, transaction_count, payment_date
      ) VALUES (
        ${entityName}, ${paymentType}, ${frequency || null}, ${amount}, ${status}, ${transactionCount || 1}, ${paymentDate}
      )
      RETURNING *
    `;

    return NextResponse.json(inserted[0]);
  } catch (error: any) {
    console.error("Save manual analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
