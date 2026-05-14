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

    // 1. Fetch valid users for validation
    const validUsers = await sql`SELECT name FROM "User"`;
    const validNames = new Set(validUsers.map(u => u.name.toLowerCase().trim()));

    let successCount = 0;
    const errors: { row: number; taskName: string; error: string; rowData?: any }[] = [];
    
    const now = new Date();
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const yearStr = String(now.getFullYear()).slice(-2);
    const prefix = `${monthStr}${yearStr}`;

    for (let i = 0; i < data.length; i++) {
      const task = data[i];
      const rowNum = task.originalRowNumber || (i + 1);

      try {
        // 2. Validation Logic
        const ownerName = String(task.ownerName || "").trim();
        const rawReviewerName = String(task.reviewerName || "").trim();
        const reviewerName = (rawReviewerName === "N/A" || !rawReviewerName) ? "Not Applicable" : rawReviewerName;

        // Check Owner
        if (!validNames.has(ownerName.toLowerCase())) {
          errors.push({ row: rowNum, taskName: task.taskName, error: `Owner "${ownerName}" not found in User Management.`, rowData: task });
          continue;
        }

        // Check Reviewer (if applicable)
        if (reviewerName !== "Not Applicable" && !validNames.has(reviewerName.toLowerCase())) {
          errors.push({ row: rowNum, taskName: task.taskName, error: `Reviewer "${reviewerName}" not found in User Management.`, rowData: task });
          continue;
        }

        // 3. Original Process Logic (Untouched)
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
          displayId = `T-${prefix}-${String(sequences[0].nextVal).padStart(2, '0')}`;
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
            ${ownerName}, ${reviewerName}, 
            ${task.dueDate ? new Date(task.dueDate).toISOString() : null}, 
            ${task.mailLink || null}, ${task.taskStatus || "Pending"},
            ${reviewStatus}, ${displayId}, 'BULK', TRUE, ${userEmail},
            NOW(), NOW()
          )
        `;
        successCount++;
      } catch (rowError: any) {
        console.error(`Error processing row ${rowNum}:`, rowError);
        errors.push({ row: rowNum, taskName: task.taskName, error: rowError.message || "Database error", rowData: task });
      }
    }

    // 4. Save to history
    try {
      await sql`
        INSERT INTO "ImportHistory" ("type", "successCount", "errorCount", "errors", "createdBy", "createdAt")
        VALUES ('tasks', ${successCount}, ${errors.length}, ${JSON.stringify(errors)}, ${userEmail}, NOW())
      `;
      // Keep only latest 5
      await sql`
        DELETE FROM "ImportHistory"
        WHERE id NOT IN (
          SELECT id FROM "ImportHistory"
          WHERE "type" = 'tasks'
          ORDER BY "createdAt" DESC
          LIMIT 5
        ) AND "type" = 'tasks'
      `;
    } catch (hError) {
      console.error("Failed to save import history:", hError);
    }

    return NextResponse.json({ 
      message: errors.length > 0 ? "Bulk import completed with some errors" : "Bulk import successful", 
      successCount,
      errorCount: errors.length,
      errors 
    }, { status: 201 });

  } catch (error: any) {
    console.error("Bulk task import failed", error);
    return NextResponse.json({ message: "Failed to import tasks", error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sql = getDb();
    const session = await getServerSession();
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const history = await sql`
      SELECT id, "type", "successCount", "errorCount", "createdAt", "createdBy", "errors"
      FROM "ImportHistory"
      ORDER BY "createdAt" DESC
      LIMIT 10
    `.catch(e => {
      console.error("Table might not exist yet:", e);
      return [];
    });

    return NextResponse.json(history);
  } catch (error: any) {
    console.error("Failed to fetch import history", error);
    return NextResponse.json([], { status: 200 }); // Return empty array instead of 500 to keep UI clean
  }
}
