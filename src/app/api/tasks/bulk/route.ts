import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";


export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getServerSession();
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
      return NextResponse.json({ message: "Invalid data format. Expected an array of tasks." }, { status: 400 });
    }

    let count = 0;
    const now = new Date();
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const yearStr = String(now.getFullYear()).slice(-2);
    const prefix = `${monthStr}${yearStr}`;

    for (const task of data) {
      const reviewerName = (task.reviewerName === "N/A" || !task.reviewerName) ? "Not Applicable" : task.reviewerName;
      const reviewStatus = task.reviewStatus || (reviewerName !== "Not Applicable" ? "Task Pending From Owner" : "Review Not Required");
      
      let displayId = null;
      try {
        const sequences = await sql`
          INSERT INTO "TaskSequence" ("monthYear", "nextVal")
          VALUES (${prefix}, 1)
          ON CONFLICT ("monthYear")
          DO UPDATE SET "nextVal" = "TaskSequence"."nextVal" + 1
          RETURNING "nextVal"
        `;
        displayId = `${prefix}-${String(sequences[0].nextVal).padStart(2, '0')}`;
      } catch (e) {
        console.error("Display ID generation error in bulk:", e);
      }

      await sql`
        INSERT INTO "Task" (
          "taskName", "entityName", "taskType", "departmentName", "frequency", "requestFrom",
          "ownerName", "reviewerName", "dueDate", "mailLink", "taskStatus",
          "reviewStatus", "displayId", "source", "isApproved", "createdByEmail", "createdAt", "updatedAt"
        )
        VALUES (
          ${task.taskName}, ${task.entityName}, ${task.taskType || "General"}, 
          ${task.departmentName || "Finance"}, ${task.frequency || null}, ${task.requestFrom || "Admin"},
          ${task.ownerName}, ${reviewerName}, 
          ${task.dueDate ? new Date(task.dueDate).toISOString() : null}, 
          ${task.mailLink || null}, ${task.taskStatus || "Pending"},
          ${reviewStatus}, ${displayId}, 'BULK', TRUE, ${userEmail},
          NOW(), NOW()
        )
      `;
      count++;
    }

    return NextResponse.json({ message: "Bulk import successful", count }, { status: 201 });
  } catch (error: any) {
    console.error("Bulk task import failed", error);
    return NextResponse.json({ message: "Failed to import tasks", error: error.message }, { status: 500 });
  }
}
