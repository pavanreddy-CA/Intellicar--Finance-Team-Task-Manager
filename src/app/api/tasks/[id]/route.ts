import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";
import { sendEmail, getEmailFromName } from "@/lib/email";


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sql = getDb();
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const taskId = parseInt(resolvedParams.id);
    const data = await req.json();

    const existingTasks = await sql`SELECT * FROM "Task" WHERE id = ${taskId}`;
    const existingTask = existingTasks[0];
    
    if (!existingTask) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const userEmail = session.user?.email;
    const userRole = (session.user as any)?.role;
    
    // Check if the user is authorized to edit this task
    const isMasterAdmin = userEmail === "pavanreddy@intellicar.in" || userRole === "ADMIN";
    const isOwner = getEmailFromName(existingTask.ownerName) === userEmail;
    const isReviewer = getEmailFromName(existingTask.reviewerName) === userEmail;

    if (!isMasterAdmin && !isOwner && !isReviewer) {
      return NextResponse.json({ message: "Forbidden: You don't have permission to edit this task" }, { status: 403 });
    }

    // Prepare updates
    let taskStatus = existingTask.taskStatus;
    let reviewStatus = existingTask.reviewStatus;
    let completionDate = existingTask.completionDate;
    let reviewCompletionDate = existingTask.reviewCompletionDate;
    let ownerComments = existingTask.ownerComments;
    let reviewerComments = existingTask.reviewerComments;
    let requestStatus = existingTask.requestStatus;

    if (data.taskStatus) {
      taskStatus = data.taskStatus;
      
      if (data.taskStatus === "Completed" && !existingTask.completionDate) {
        completionDate = new Date().toISOString();
      }

      if (data.taskStatus === "Completed" && existingTask.taskStatus !== "Completed") {
        reviewStatus = (existingTask.reviewerName === "Not Applicable" || !existingTask.reviewerName) 
          ? "Review Not Required" 
          : "Pending";
      } else if (data.taskStatus === "Pending") {
        reviewStatus = "Task Pending From Owner";
        reviewCompletionDate = null;
      }
    }

    if (data.completionDate !== undefined) {
      if (data.completionDate) {
        completionDate = new Date(data.completionDate).toISOString();
        taskStatus = "Completed";
        reviewStatus = (existingTask.reviewerName === "Not Applicable" || !existingTask.reviewerName) 
          ? "Review Not Required" 
          : "Pending";
      } else {
        completionDate = null;
        taskStatus = "Pending";
        reviewStatus = "Task Pending From Owner";
        reviewCompletionDate = null;
      }
    }

    if (data.reviewCompletionDate !== undefined) {
      if (data.reviewCompletionDate) {
        reviewCompletionDate = new Date(data.reviewCompletionDate).toISOString();
        reviewStatus = "Completed";
      } else {
        reviewCompletionDate = null;
        reviewStatus = "Pending";
      }
    }

    if (data.ownerComments !== undefined) {
      ownerComments = data.ownerComments;
    }

    if (data.reviewerComments !== undefined) {
      reviewerComments = data.reviewerComments;
    }

    if (data.requestStatus !== undefined) {
      requestStatus = data.requestStatus;
    }

    const updatedTasks = await sql`
      UPDATE "Task"
      SET "taskName" = ${data.taskName !== undefined ? data.taskName : existingTask.taskName},
          "entityName" = ${data.entityName !== undefined ? data.entityName : existingTask.entityName},
          "taskType" = ${data.taskType !== undefined ? data.taskType : existingTask.taskType},
          "departmentName" = ${data.departmentName !== undefined ? data.departmentName : existingTask.departmentName},
          "requestFrom" = ${data.requestFrom !== undefined ? data.requestFrom : existingTask.requestFrom},
          "ownerName" = ${data.ownerName !== undefined ? data.ownerName : existingTask.ownerName},
          "reviewerName" = ${data.reviewerName !== undefined ? data.reviewerName : existingTask.reviewerName},
          "dueDate" = ${data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate).toISOString() : null) : existingTask.dueDate},
          "mailLink" = ${data.mailLink !== undefined ? data.mailLink : existingTask.mailLink},
          "taskStatus" = ${taskStatus},
          "reviewStatus" = ${reviewStatus},
          "completionDate" = ${completionDate},
          "reviewCompletionDate" = ${reviewCompletionDate},
          "ownerComments" = ${ownerComments},
          "reviewerComments" = ${reviewerComments},
          "requestStatus" = ${requestStatus},
          "updatedAt" = NOW()
      WHERE id = ${taskId}
      RETURNING *
    `;
    
    const updatedTask = updatedTasks[0];

    // Send email to reviewer if status just changed to Completed and review is required
    if (taskStatus === "Completed" && existingTask.taskStatus !== "Completed" && updatedTask.reviewStatus === "Pending") {
      const reviewerEmail = getEmailFromName(updatedTask.reviewerName);
      if (reviewerEmail) {
        const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || "https://intellicar-finance-team-task-manage-one.vercel.app/";

        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0f172a; margin-top: 0;">Task Ready for Review</h2>
            <p style="font-size: 16px; color: #334155;">Hello <strong>${updatedTask.reviewerName}</strong>,</p>
            <p style="font-size: 16px; color: #334155;">The following task has been marked as completed by <strong>${updatedTask.ownerName}</strong> and is now pending your review:</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f1f5f9;">
              <table border="0" cellpadding="5" cellspacing="0" style="width: 100%; font-size: 14px;">
                <tr><td style="color: #64748b; width: 100px;">Task Name:</td><td style="color: #0f172a; font-weight: 600;">${updatedTask.taskName}</td></tr>
                <tr><td style="color: #64748b;">Entity:</td><td style="color: #0f172a;">${updatedTask.entityName}</td></tr>
                <tr><td style="color: #64748b;">Completed On:</td><td style="color: #0f172a;">${updatedTask.completionDate ? new Date(updatedTask.completionDate).toDateString() : "Today"}</td></tr>
              </table>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" style="background: #2563eb; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Login to Dashboard</a>
            </div>

            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">This is an automated notification from Intellicar Finance Team Task Manager.</p>
          </div>
        `;
        sendEmail({ to: reviewerEmail, subject: `[Pending Review] ${updatedTask.taskName} - ${updatedTask.entityName}`, html: emailHtml });
      }
    }

    return NextResponse.json(updatedTask, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to update task", error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sql = getDb();
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const taskId = parseInt(resolvedParams.id);

    const userEmail = session.user?.email;
    const userRole = (session.user as any)?.role;
    
    // Only Master Admin can delete tasks
    const isMasterAdmin = userEmail === "pavanreddy@intellicar.in" || userRole === "ADMIN";

    if (!isMasterAdmin) {
      return NextResponse.json({ message: "Forbidden: Only Master Admin can delete tasks" }, { status: 403 });
    }

    await sql`DELETE FROM "Task" WHERE id = ${taskId}`;

    return NextResponse.json({ message: "Task deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to delete task", error: error.message }, { status: 500 });
  }
}
