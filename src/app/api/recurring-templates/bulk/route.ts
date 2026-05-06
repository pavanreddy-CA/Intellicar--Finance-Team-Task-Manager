import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user?.email;
    const userRole = (session.user as any)?.role;
    if (userEmail !== "pavanreddy@intellicar.in" && userRole !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const data = await req.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ message: "Invalid data format. Expected an array of templates." }, { status: 400 });
    }

    let count = 0;
    for (const template of data) {
      await sql`
        INSERT INTO "RecurringTemplate" (
          "taskNamePattern", "entityName", "taskType", "departmentName", "financeFunction",
          "frequency", "dayOffset", "monthOffset", "defaultOwner", "defaultReviewer",
          "isActive", "startDate", "endDate", "freqLabel", "isStopped", "createdAt", "updatedAt"
        )
        VALUES (
          ${template.taskNamePattern}, ${template.entityName}, ${template.taskType || "External"},
          ${template.departmentName || "Finance"}, ${template.financeFunction || null},
          ${template.frequency}, ${Number(template.dayOffset) || 0}, ${Number(template.monthOffset) || 0},
          ${(template.defaultOwner === "N/A" || !template.defaultOwner) ? null : template.defaultOwner}, 
          ${(template.defaultReviewer === "N/A" || !template.defaultReviewer) ? null : template.defaultReviewer},
          ${template.isActive !== undefined ? template.isActive : true},
          ${template.startDate ? new Date(template.startDate).toISOString() : null},
          ${template.endDate ? new Date(template.endDate).toISOString() : null},
          ${template.freqLabel || null},
          FALSE,
          NOW(), NOW()
        )
      `;
      count++;
    }

    return NextResponse.json({ message: "Bulk import successful", count }, { status: 201 });
  } catch (error: any) {
    console.error("Bulk recurring template import failed", error);
    return NextResponse.json({ message: "Failed to import recurring templates", error: error.message }, { status: 500 });
  }
}
