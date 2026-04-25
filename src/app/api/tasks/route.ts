import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";
import { sendEmail, getEmailFromName } from "@/lib/email";


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
      return NextResponse.json(tasks, { status: 200 });
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
        return task.taskStatus === "Completed" || task.reviewStatus === "Pending" || task.reviewStatus === "Completed" || task.reviewStatus === "Review Not Required";
      }

      return false;
    });

    return NextResponse.json(filteredTasks, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to fetch tasks", error: error.message }, { status: 500 });
  }
}

// POST /api/tasks
export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    const {
      taskName,
      entityName,
      taskType,
      departmentName,
      requestFrom,
      ownerName,
      reviewerName,
      dueDate,
      mailLink,
      linkedRequestId,
    } = data;

    if (!taskName || !entityName || !taskType || !departmentName || !requestFrom || !ownerName) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Default business logic
    const resolvedReviewer = reviewerName || "Not Applicable";
    const reviewStatus = resolvedReviewer === "Not Applicable" ? "Review Not Required" : "Task Pending From Owner";
    
    // Set default request status
    const requestStatus = linkedRequestId ? "Pending" : "Not Applicable";

    const newTasks = await sql`
      INSERT INTO "Task" (
        "taskName", "entityName", "taskType", "departmentName", "requestFrom",
        "ownerName", "reviewerName", "dueDate", "mailLink", "taskStatus",
        "reviewStatus", "linkedRequestId", "requestStatus", "transferStatus", "originalRequestType", "createdAt", "updatedAt"
      )
      VALUES (
        ${taskName}, ${entityName}, ${taskType}, ${departmentName}, ${requestFrom},
        ${ownerName}, ${resolvedReviewer}, ${dueDate ? new Date(dueDate).toISOString() : null}, ${mailLink || null}, 'Pending',
        ${reviewStatus}, ${linkedRequestId || null}, ${requestStatus}, ${data.transferStatus || 'O'}, ${data.originalRequestType || null}, NOW(), NOW()
      )
      RETURNING *
    `;
    
    const newTask = newTasks[0];

    // Link back to External Request if applicable
    if (linkedRequestId) {
      await sql`
        UPDATE "ExternalRequest"
        SET status = 'Under Process', "convertedTaskId" = ${newTask.id}
        WHERE id = ${Number(linkedRequestId)}
      `;
    }

    const ownerEmail = getEmailFromName(ownerName);
    if (ownerEmail) {
      const dashboardUrl = "https://intellicar-finance-team-task-manage-one.vercel.app/";
      
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

          ${mailLink ? `
            <div style="text-align: center; margin-bottom: 20px;">
              <a href="${mailLink}" style="color: #2563eb; text-decoration: none; font-size: 14px;">View Linked Email Reference</a>
            </div>
          ` : ""}

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">This is an automated notification from Intellicar Finance Team Task Manager.</p>
        </div>
      `;
      sendEmail({ to: ownerEmail, subject: `[New Task] ${taskName} - ${entityName}`, html: emailHtml });
    }

    return NextResponse.json({ message: "Task created", task: newTask }, { status: 201 });
  } catch (error: any) {
    console.error("Task creation error:", error);
    return NextResponse.json({ message: "Failed to create task", error: error.message }, { status: 500 });
  }
}
