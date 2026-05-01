import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";
import { sendEmail, getEmailFromName } from "@/lib/email";
import { getTrackingStatus, COMPLETION_STATUSES } from "@/lib/taskUtils";


// GET /api/tasks
export async function GET(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user?.email;
    const userRole = (session.user as any)?.role;
    
    // Master Admin can see everything
    if (userEmail === "pavanreddy@intellicar.in" || userRole === "ADMIN") {
      const tasks = await sql`
        SELECT * FROM "Task"
        ORDER BY "createdAt" DESC
      `;
      // Transform statuses for display
      const transformed = tasks.map(t => ({
        ...t,
        taskStatus: getTrackingStatus(t as any)
      }));
      return NextResponse.json(transformed, { status: 200 });
    }

    // Regular users only see tasks assigned to them or created by them
    const allTasks = await sql`
      SELECT * FROM "Task"
      ORDER BY "createdAt" DESC
    `;

    const filteredTasks = allTasks.filter(task => {
      const ownerEmail = getEmailFromName(task.ownerName);
      const reviewerEmail = getEmailFromName(task.reviewerName);
      
      // Owner can always see their tasks
      if (ownerEmail === userEmail) return true;
      
      // Reviewer can only see the task if the owner has finished it
      if (reviewerEmail === userEmail) {
        // Use completion check on original data
        const isCompleted = task.taskStatus === "Completed" || !!task.completionDate;
        return isCompleted || task.reviewStatus === "Pending" || task.reviewStatus === "Completed" || task.reviewStatus === "Review Not Required";
      }

      return false;
    }).map(t => ({
      ...t,
      taskStatus: getTrackingStatus(t as any)
    }));

    return NextResponse.json(filteredTasks, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to fetch tasks", error: error.message }, { status: 500 });
  }
}

// POST /api/tasks
export async function POST(req: NextRequest) {
  const sql = getDb();
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const data = await req.json();
  let taskName: string = "", taskType: string = "", assignments: any[] = [], dueDate: string = "";
  let departmentName: string = "", requestFrom: string = "", mailLink: string = "", linkedRequestId: any = null;

  try {
    ({
      taskName,
      taskType,
      departmentName,
      requestFrom,
      dueDate,
      mailLink,
      linkedRequestId,
      assignments, // New: Array of { entityName, ownerName, reviewerName }
    } = data);

    // Ensure columns exist (Self-healing)
    try {
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "entityName" TEXT`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "originalRequestType" TEXT`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "transferStatus" TEXT DEFAULT 'O'`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "frequency" TEXT`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "editApproved" BOOLEAN DEFAULT FALSE`;
    } catch (e) {
      console.log("Task migration check skipped/failed");
    }

    if (!taskName || !taskType || !departmentName || !requestFrom || !assignments || !assignments.length) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const createdTasks = [];
    const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || "https://v0-finpulse.vercel.app/";

    for (const assignment of assignments) {
      const { entityName, ownerName, reviewerName } = assignment;
      
      const resolvedReviewer = reviewerName || "Not Applicable";
      const reviewStatus = resolvedReviewer === "Not Applicable" ? "Review Not Required" : "Task Pending From Owner";
      const requestStatus = linkedRequestId ? "Pending" : "Not Applicable";

      // Generate MMYY-XX Display ID
      const now = new Date();
      const monthStr = String(now.getMonth() + 1).padStart(2, '0');
      const yearStr = String(now.getFullYear()).slice(-2);
      const prefix = `${monthStr}${yearStr}`;

      let displayId = "";
      try {
        // Ensure displayId and TaskSequence exist
        await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "displayId" TEXT`;
        await sql`CREATE TABLE IF NOT EXISTS "TaskSequence" ("monthYear" TEXT PRIMARY KEY, "nextVal" INTEGER DEFAULT 1)`;
        
        const sequences = await sql`
          INSERT INTO "TaskSequence" ("monthYear", "nextVal")
          VALUES (${prefix}, 1)
          ON CONFLICT ("monthYear")
          DO UPDATE SET "nextVal" = "TaskSequence"."nextVal" + 1
          RETURNING "nextVal"
        `;
        const nextVal = sequences[0].nextVal;
        displayId = `${prefix}-${String(nextVal).padStart(2, '0')}`;
      } catch (e) {
        console.error("Display ID generation error", e);
      }

      const parseDate = (d: string) => {
        if (!d) return null;
        const parsed = new Date(d);
        if (!isNaN(parsed.getTime())) return parsed.toISOString();
        // Try DD-MM-YYYY
        const parts = d.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length === 2 && parts[2].length === 4) {
            const d2 = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            if (!isNaN(d2.getTime())) return d2.toISOString();
          }
        }
        return null;
      };

      const newTasks = await sql`
        INSERT INTO "Task" (
          "taskName", "entityName", "taskType", "departmentName", "requestFrom",
          "ownerName", "reviewerName", "dueDate", "mailLink", "taskStatus",
          "reviewStatus", "linkedRequestId", "requestStatus", "transferStatus", "originalRequestType", "frequency", "displayId", "createdAt", "updatedAt"
        )
        VALUES (
          ${taskName}, ${entityName}, ${taskType}, ${departmentName}, ${requestFrom},
          ${ownerName}, ${resolvedReviewer}, ${parseDate(dueDate)}, ${mailLink || null}, 'Pending',
          ${reviewStatus}, ${linkedRequestId || null}, ${requestStatus}, ${data.transferStatus || 'O'}, ${data.originalRequestType || null}, ${data.frequency || null}, ${displayId || null}, NOW(), NOW()
        )
        RETURNING *
      `;
      
      const newTask = newTasks[0];
      createdTasks.push(newTask);

      // Email Notification
      const ownerEmail = getEmailFromName(ownerName);
      if (ownerEmail) {
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0f172a; margin-top: 0;">New Task Assigned</h2>
            <p style="font-size: 16px; color: #334155;">Hello <strong>${ownerName}</strong>,</p>
            <p style="font-size: 16px; color: #334155;">A new task has been assigned to you in the Finance Task Manager:</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f1f5f9;">
              <table border="0" cellpadding="5" cellspacing="0" style="width: 100%; font-size: 14px;">
                <tr><td style="color: #64748b; width: 100px;">Task Name:</td><td style="color: #0f172a; font-weight: 600;">${taskName}</td></tr>
                <tr><td style="color: #64748b;">Entity:</td><td style="color: #0f172a;">${entityName}</td></tr>
                <tr><td style="color: #64748b;">Due Date:</td><td style="color: #0f172a;">${dueDate ? new Date(dueDate).toDateString() : "No deadline"}</td></tr>
              </table>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" style="background: #2563eb; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Login to Dashboard</a>
            </div>

            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">This is an automated notification from Intellicar Finance Team Task Manager.</p>
          </div>
        `;
        sendEmail({ to: ownerEmail, subject: `[New Task] ${taskName} - ${entityName}`, html: emailHtml });
      }
    }

    // Link back to External Request if applicable (link to the FIRST created task)
    if (linkedRequestId && createdTasks.length > 0) {
      await sql`
        UPDATE "ExternalRequest"
        SET status = 'Under Process', "convertedTaskId" = ${createdTasks[0].id}
        WHERE id = ${Number(linkedRequestId)}
      `;
    }

    return NextResponse.json({ message: "Tasks created", count: createdTasks.length }, { status: 201 });
  } catch (error: any) {
    console.error("Task creation error:", error);
    console.error("Task creation error - Full Data:", { taskName, assignments, dueDate });
    console.error("Error details:", error);
    return NextResponse.json({ message: "Failed to create task", error: error.message }, { status: 500 });
  }
}
