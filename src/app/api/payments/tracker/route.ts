import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET /api/payments/tracker
export async function GET() {
  try {
    const sql = getDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const occurrences = await sql`
      SELECT o.*, t."entityName", t."vendorName", t."paymentDescription", t."paymentType", t."departmentName", t."financeFunction", t.frequency
      FROM "PaymentOccurrence" o
      JOIN "PaymentTemplate" t ON o."templateId" = t.id
      ORDER BY o."dueDate" ASC
    `;
    return NextResponse.json(occurrences);
  } catch (error: any) {
    console.error("Fetch payment occurrences error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/payments/tracker (Generation)
export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payments } = await req.json(); // Array of { templateId, dueDate, periodKey }

    if (!Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json({ error: "No payments provided" }, { status: 400 });
    }

    const results = [];
    const errors = [];

    for (const p of payments) {
      try {
        // Duplicate check
        const existing = await sql`
          SELECT id FROM "PaymentOccurrence"
          WHERE "templateId" = ${p.templateId}
          AND "dueDate" = ${p.dueDate}
          LIMIT 1
        `;

        if (existing.length > 0) {
          errors.push({ templateId: p.templateId, error: "Payment already generated for this date" });
          continue;
        }

        const inserted = await sql`
          INSERT INTO "PaymentOccurrence" ("templateId", "dueDate", "isPaid", "createdAt", "updatedAt")
          VALUES (${p.templateId}, ${p.dueDate}, FALSE, NOW(), NOW())
          RETURNING *
        `;

        // Update template's lastGeneratedPeriod
        await sql`
          UPDATE "PaymentTemplate"
          SET "lastGeneratedPeriod" = ${p.periodKey}, "updatedAt" = NOW()
          WHERE id = ${p.templateId}
        `;

        results.push(inserted[0]);
      } catch (err: any) {
        errors.push({ templateId: p.templateId, error: err.message });
      }
    }

    return NextResponse.json({ 
      successCount: results.length, 
      errorCount: errors.length,
      errors 
    });
  } catch (error: any) {
    console.error("Payment generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
