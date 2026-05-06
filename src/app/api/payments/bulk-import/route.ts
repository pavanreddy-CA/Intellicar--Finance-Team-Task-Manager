import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    const results = [];
    const errors = [];

    for (const item of items) {
      try {
        const {
          entityName,
          paymentDescription,
          vendorName,
          paymentType,
          departmentName,
          financeFunction,
          frequency,
          dueDay,
          weeklyDay,
          vendorEmail,
          prodEmail,
          defaultOwner,
          defaultReviewer,
          startDate,
          endDate
        } = item;

        if (!entityName || !paymentDescription || !vendorName || !frequency) {
          errors.push({ item, error: "Missing required fields (Entity, Description, Vendor, Frequency)" });
          continue;
        }

        const inserted = await sql`
          INSERT INTO "PaymentTemplate" (
            "entityName", "paymentDescription", "vendorName", "paymentType",
            "departmentName", "financeFunction", "frequency", "dueDay", "weeklyDay",
            "vendorEmail", "prodEmail", "defaultOwner", "defaultReviewer",
            "startDate", "endDate", "isActive", "createdAt", "updatedAt"
          )
          VALUES (
            ${entityName}, ${paymentDescription}, ${vendorName}, ${paymentType},
            ${departmentName}, ${financeFunction}, ${frequency}, ${dueDay ? Number(dueDay) : null}, ${weeklyDay || null},
            ${vendorEmail}, ${prodEmail}, 
            ${(defaultOwner === "N/A" || !defaultOwner) ? null : defaultOwner}, 
            ${(defaultReviewer === "N/A" || !defaultReviewer) ? null : defaultReviewer},
            ${startDate ? new Date(startDate) : null}, ${endDate ? new Date(endDate) : null},
            TRUE, NOW(), NOW()
          )
          RETURNING id
        `;
        results.push(inserted[0]);
      } catch (err: any) {
        errors.push({ item, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      errorCount: errors.length,
      errors
    });
  } catch (error: any) {
    console.error("Bulk import payments error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
