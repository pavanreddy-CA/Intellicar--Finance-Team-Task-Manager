import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";
import { sendEmail, getEmailFromName } from "@/lib/email";
import { getTrackingStatus, COMPLETION_STATUSES } from "@/lib/taskUtils";
import { triggerNotification } from "@/services/notificationService";


// GET /api/tasks
export async function GET(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session?.user?.email;
    const userRole = (session?.user as any)?.role;
    
    // Master Admin can see everything
    const isMasterAdmin = userEmail?.toLowerCase() === "pavanreddy@intellicar.in" || userRole === "ADMIN" || userRole === "ALLOCATOR";
    if (isMasterAdmin) {
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

    // Regular users only see tasks assigned to them or created by them AND approved tasks
    const allTasks = await sql`
      SELECT * FROM "Task"
      WHERE "isApproved" = TRUE
      ORDER BY "createdAt" DESC
    `;

    const filteredTasks = allTasks.filter(task => {
      const ownerEmail = getEmailFromName(task.ownerName);
      const reviewerEmail = getEmailFromName(task.reviewerName);
      const requesterEmail = getEmailFromName(task.requestFrom);
      
      // Owner can always see their tasks
      if (ownerEmail === userEmail) return true;
      
      // Creator can always see their tasks
      if ((task as any).createdByEmail === userEmail) return true;
      
      // Fallback for tasks created before createdByEmail was added
      if (requesterEmail === userEmail) return true;

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
  const userRole = (session?.user as any)?.role;

  if (userRole === "VIEWER") {
    return NextResponse.json({ message: "Forbidden: Viewers cannot create tasks" }, { status: 403 });
  }

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
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN DEFAULT TRUE`;
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

      let displayId = null;
      try {
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
        console.error("Display ID generation error (Non-fatal):", e);
      }

      const parseDate = (d: string) => {
        if (!d) return null;
        const parsed = new Date(d);
        if (!isNaN(parsed.getTime())) return parsed.toISOString();
        const parts = d.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length === 2 && parts[2].length === 4) {
            const d2 = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            if (!isNaN(d2.getTime())) return d2.toISOString();
          }
        }
        return null;
      };

      try {
        const newTasks = await sql`
          INSERT INTO "Task" (
            "taskName", "entityName", "taskType", "departmentName", "requestFrom",
            "ownerName", "reviewerName", "dueDate", "mailLink", "taskStatus",
            "reviewStatus", "linkedRequestId", "requestStatus", "transferStatus", "originalRequestType", "frequency", "displayId", "isApproved", "createdByEmail", "createdAt", "updatedAt"
          )
          VALUES (
            ${taskName}, ${entityName}, ${taskType}, ${departmentName}, ${requestFrom},
            ${ownerName}, ${resolvedReviewer}, ${parseDate(dueDate)}, ${mailLink || null}, 'Pending',
            ${reviewStatus}, ${linkedRequestId || null}, ${requestStatus}, ${data.transferStatus || 'O'}, ${data.originalRequestType || null}, ${data.frequency || null}, ${displayId}, TRUE, ${session.user.email}, NOW(), NOW()
          )
          RETURNING *
        `;
        
        const newTask = newTasks[0];
        createdTasks.push(newTask);

        // Trigger Notification
        try {
          await triggerNotification('TASK_ASSIGNED', newTask);
        } catch (notifErr) {
          console.error("Notification failed (Non-fatal):", notifErr);
        }
      } catch (insertErr: any) {
        console.error("INSERT FAILED for assignment:", assignment, insertErr);
        throw insertErr; // Re-throw to catch block
      }
    }

    // Link back to External Request if applicable
    if (linkedRequestId && createdTasks.length > 0) {
      try {
        await sql`
          UPDATE "ExternalRequest"
          SET status = 'Under Process', "convertedTaskId" = ${createdTasks[0].id}
          WHERE id = ${Number(linkedRequestId)}
        `;
      } catch (linkErr) {
        console.error("Link back to ExternalRequest failed:", linkErr);
      }
    }

    return NextResponse.json({ message: "Tasks created", count: createdTasks.length }, { status: 201 });
  } catch (error: any) {
    console.error("CRITICAL Task creation error:", error);
    // Return detailed error to UI for diagnosis
    return NextResponse.json({ 
      message: `DB Error: ${error.message || "Unknown error"}`, 
      details: error.message,
      error: error.message 
    }, { status: 500 });
  }
}
