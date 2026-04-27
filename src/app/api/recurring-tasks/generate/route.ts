import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getEmailFromName, sendEmail } from "@/lib/email";

// POST /api/recurring-tasks/generate
export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Ensure Task table is ready for recurring fields ---
    try {
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "templateId" INTEGER`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "periodKey" TEXT`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "financeFunction" TEXT`;
    } catch (err) {
      console.error("Migration error in task generation:", err);
    }

    const { tasks } = await req.json(); // Array of { templateId, entityName, taskName, ownerName, reviewerName, dueDate, periodKey }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ error: "No tasks provided" }, { status: 400 });
    }

    const results = [];
    const errors = [];

    for (const taskItem of tasks) {
      try {
        // 1. Duplicate Check
        const existing = await sql`
          SELECT id FROM "Task" 
          WHERE "templateId" = ${taskItem.templateId} 
          AND "entityName" = ${taskItem.entityName} 
          AND "periodKey" = ${taskItem.periodKey}
          LIMIT 1
        `;

        if (existing.length > 0) {
          errors.push({ taskName: taskItem.taskName, error: "Task already exists for this period" });
          continue;
        }

        // 2. Insert into Task table
        const resolvedReviewer = taskItem.reviewerName || "Not Applicable";
        const reviewStatus = resolvedReviewer === "Not Applicable" ? "Review Not Required" : "Task Pending From Owner";

        const newTasks = await sql`
          INSERT INTO "Task" (
            "taskName", "entityName", "taskType", "departmentName", "financeFunction", "requestFrom",
            "ownerName", "reviewerName", "dueDate", "taskStatus", "reviewStatus",
            "templateId", "periodKey", "frequency", "createdAt", "updatedAt"
          )
          VALUES (
            ${taskItem.taskName}, ${taskItem.entityName}, ${taskItem.taskType}, ${taskItem.departmentName || 'Finance'}, ${taskItem.financeFunction || null}, 'System (Recurring)',
            ${taskItem.ownerName}, ${resolvedReviewer}, ${taskItem.dueDate ? new Date(taskItem.dueDate).toISOString() : null},
            'Pending', ${reviewStatus},
            ${taskItem.templateId}, ${taskItem.periodKey}, ${taskItem.freqLabel || null}, NOW(), NOW()
          )
          RETURNING *
        `;

        const newTask = newTasks[0];
        results.push(newTask);

        // 3. Update Last Generated Period on Template
        await sql`
          UPDATE "RecurringTemplate" 
          SET "lastGeneratedPeriod" = ${taskItem.periodKey}, "updatedAt" = NOW()
          WHERE id = ${taskItem.templateId}
        `;

        // 4. Send Email Notification
        const ownerEmail = getEmailFromName(taskItem.ownerName);
        if (ownerEmail) {
          const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || "https://intellicar-finance-team-task-manage-one.vercel.app/";
          const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #0f172a; margin-top: 0;">New Recurring Task Assigned</h2>
              <p>A recurring task has been generated and assigned to you.</p>
              <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                <strong>Task:</strong> ${taskItem.taskName}<br>
                <strong>Entity:</strong> ${taskItem.entityName}<br>
                <strong>Period:</strong> ${taskItem.periodKey}<br>
                <strong>Due Date:</strong> ${taskItem.dueDate || "N/A"}
              </div>
              <p style="text-align: center; margin-top: 20px;">
                <a href="${dashboardUrl}" style="background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Go to Dashboard</a>
              </p>
            </div>
          `;
          await sendEmail({ to: ownerEmail, subject: `[Recurring Task] ${taskItem.taskName}`, html: emailHtml });
        }

      } catch (err: any) {
        errors.push({ taskName: taskItem.taskName, error: err.message });
      }
    }

    return NextResponse.json({ 
      successCount: results.length, 
      errorCount: errors.length,
      errors 
    });

  } catch (error: any) {
    console.error("Task generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
