import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";
import { sendEmail, getEmailFromName } from "@/lib/email";
import { triggerNotification } from "@/services/notificationService";


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
    const userRole = (session?.user as any)?.role;

    if (userRole === "VIEWER") {
      return NextResponse.json({ message: "Forbidden: Viewers cannot modify tasks" }, { status: 403 });
    }

    // Ensure columns exist (Self-healing)
    try {
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "captureLO" TEXT`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "transferStatus" TEXT DEFAULT 'O'`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "originalRequestType" TEXT`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN DEFAULT TRUE`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "editApproved" BOOLEAN DEFAULT FALSE`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "editRequested" BOOLEAN DEFAULT FALSE`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "completedSubmissionAt" TIMESTAMP(3)`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "reviewedSubmissionAt" TIMESTAMP(3)`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "processedSubmissionAt" TIMESTAMP(3)`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "completedBy" TEXT`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "processedBy" TEXT`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "createdByEmail" TEXT`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "processedMode" TEXT`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "processedMailLink" TEXT`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "processedAttachments" JSONB`;
      
      await sql`ALTER TABLE "ExternalRequest" ADD COLUMN IF NOT EXISTS "processedMode" TEXT`;
      await sql`ALTER TABLE "ExternalRequest" ADD COLUMN IF NOT EXISTS "processedMailLink" TEXT`;
      await sql`ALTER TABLE "ExternalRequest" ADD COLUMN IF NOT EXISTS "processedAttachments" JSONB`;
      await sql`ALTER TABLE "ExternalRequest" ADD COLUMN IF NOT EXISTS "processedBy" TEXT`;
      await sql`ALTER TABLE "ExternalRequest" ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3)`;
    } catch (e) {
      console.error("Task update migration check failed", e);
    }

    const existingTasks = await sql`SELECT * FROM "Task" WHERE id = ${taskId}`;
    const existingTask = existingTasks[0];
    
    if (!existingTask) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const userEmail = session.user?.email;
    
    // Check if the user is authorized to edit this task
    const isMasterAdmin = userEmail?.toLowerCase() === "pavanreddy@intellicar.in" || userRole === "ADMIN";
    const isOwner = getEmailFromName(existingTask.ownerName)?.toLowerCase() === userEmail?.toLowerCase();
    const isReviewer = getEmailFromName(existingTask.reviewerName)?.toLowerCase() === userEmail?.toLowerCase();

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
    let completedSubmissionAt = existingTask.completedSubmissionAt;
    let reviewedSubmissionAt = existingTask.reviewedSubmissionAt;
    let processedSubmissionAt = existingTask.processedSubmissionAt;
    let completedBy = existingTask.completedBy;
    let reviewedBy = existingTask.reviewedBy;
    let processedBy = existingTask.processedBy;

    const userName = session.user?.name || session.user?.email || "Unknown";

    if (data.taskStatus) {
      taskStatus = data.taskStatus;
      
      if (data.taskStatus === "Completed" && !existingTask.completionDate) {
        completionDate = new Date().toISOString();
        completedSubmissionAt = new Date().toISOString();
        completedBy = userName;
      }

      if (data.taskStatus === "Completed" && existingTask.taskStatus !== "Completed") {
        reviewStatus = (existingTask.reviewerName === "Not Applicable" || !existingTask.reviewerName) 
          ? "Review Not Required" 
          : "Pending";
      } else if (data.taskStatus === "Pending") {
        reviewStatus = "Task Pending From Owner";
        reviewCompletionDate = null;
        completedBy = null;
      }
    }

    if (data.completionDate !== undefined) {
      if (data.completionDate) {
        completionDate = new Date(data.completionDate).toISOString();
        taskStatus = "Completed";
        reviewStatus = (existingTask.reviewerName === "Not Applicable" || !existingTask.reviewerName) 
          ? "Review Not Required" 
          : "Pending";
        completedSubmissionAt = new Date().toISOString();
        completedBy = userName;
      } else {
        completionDate = null;
        taskStatus = "Pending";
        reviewStatus = "Task Pending From Owner";
        reviewCompletionDate = null;
        completedBy = null;
      }
    }

    if (data.reviewCompletionDate !== undefined) {
      if (data.reviewCompletionDate) {
        // STRICT RULE: Review completion is locked until the owner completes the task
        if (taskStatus !== "Completed") {
          return NextResponse.json({ 
            message: "Forbidden: Review cannot be completed until the owner officially completes the task." 
          }, { status: 403 });
        }

        reviewCompletionDate = new Date(data.reviewCompletionDate).toISOString();
        reviewStatus = "Completed";
        reviewedSubmissionAt = new Date().toISOString();
        reviewedBy = userName;
      } else {
        reviewCompletionDate = null;
        reviewStatus = "Pending";
        reviewedBy = null;
      }
    }

    if (data.ownerComments !== undefined) ownerComments = data.ownerComments;
    if (data.reviewerComments !== undefined) reviewerComments = data.reviewerComments;

    // RULE: If completion date or review date is removed, requestStatus must revert to Pending
    if ((data.completionDate === null || data.completionDate === "") || 
        (data.reviewCompletionDate === null || data.reviewCompletionDate === "")) {
      requestStatus = "Pending";
    }

    // RULE: Once an approved edit is saved by a non-admin, revoke the edit access
    let editApproved = existingTask.editApproved;
    let editRequested = existingTask.editRequested;

    if (existingTask.editApproved && !isMasterAdmin) {
      editApproved = false;
      editRequested = false;
    }

    if (data.requestStatus !== undefined) {
      requestStatus = data.requestStatus;
      if (data.requestStatus === "Processed" && existingTask.requestStatus !== "Processed") {
        processedSubmissionAt = new Date().toISOString();
        processedBy = userName;
      }
    }

    let processedMode = existingTask.processedMode;
    let processedMailLink = existingTask.processedMailLink;
    let processedAttachments = existingTask.processedAttachments;

    if (data.processedMode !== undefined) processedMode = data.processedMode;
    if (data.processedMailLink !== undefined) processedMailLink = data.processedMailLink;
    if (data.processedAttachments !== undefined) processedAttachments = data.processedAttachments;

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
          "completedSubmissionAt" = ${completedSubmissionAt},
          "reviewedSubmissionAt" = ${reviewedSubmissionAt},
          "processedSubmissionAt" = ${processedSubmissionAt},
          "completedBy" = ${completedBy},
          "reviewedBy" = ${reviewedBy},
          "processedBy" = ${processedBy},
          "frequency" = ${data.frequency !== undefined ? data.frequency : existingTask.frequency},
          "transferStatus" = ${data.transferStatus !== undefined ? data.transferStatus : existingTask.transferStatus},
          "originalRequestType" = ${data.originalRequestType !== undefined ? data.originalRequestType : existingTask.originalRequestType},
          "captureLO" = ${data.captureLO !== undefined ? data.captureLO : existingTask.captureLO},
          "isApproved" = ${data.isApproved !== undefined ? data.isApproved : existingTask.isApproved},
          "editApproved" = ${editApproved},
          "editRequested" = ${editRequested},
          "processedMode" = ${processedMode},
          "processedMailLink" = ${processedMailLink},
          "processedAttachments" = ${processedAttachments !== undefined ? JSON.stringify(processedAttachments) : (existingTask.processedAttachments ? JSON.stringify(existingTask.processedAttachments) : null)},
          "transferredBy" = ${ (data.departmentName !== undefined && data.departmentName !== existingTask.departmentName) || (data.financeFunction !== undefined && data.financeFunction !== existingTask.financeFunction) ? userName : existingTask.transferredBy },
          "transferredAt" = ${ (data.departmentName !== undefined && data.departmentName !== existingTask.departmentName) || (data.financeFunction !== undefined && data.financeFunction !== existingTask.financeFunction) ? new Date().toISOString() : existingTask.transferredAt },
          "transferStatus" = ${ (data.departmentName !== undefined && data.departmentName !== existingTask.departmentName) || (data.financeFunction !== undefined && data.financeFunction !== existingTask.financeFunction) ? 'T' : (data.transferStatus !== undefined ? data.transferStatus : existingTask.transferStatus) }
      WHERE id = ${taskId}
      RETURNING *
    `;
    
    const updatedTask = updatedTasks[0];

    // Send email to reviewer if status just changed to Completed and review is required
    if (taskStatus === "Completed" && existingTask.taskStatus !== "Completed" && updatedTask.reviewStatus === "Pending") {
      await triggerNotification('TASK_COMPLETED', updatedTask);
    }

    // Send email to owner if task is rejected (returned to Pending)
    if (taskStatus === "Pending" && existingTask.taskStatus === "Completed") {
      await triggerNotification('TASK_REJECTED', updatedTask);
    }

    // Sync with ExternalRequest if applicable
    if (updatedTask.linkedRequestId && requestStatus !== existingTask.requestStatus) {
      try {
        const extReqs = await sql`SELECT "requesterEmail" FROM "ExternalRequest" WHERE id = ${Number(updatedTask.linkedRequestId)}`;
        const extReq = extReqs[0];

        await sql`
          UPDATE "ExternalRequest"
          SET status = ${requestStatus},
              "processedMode" = ${processedMode},
              "processedMailLink" = ${processedMailLink},
              "processedAttachments" = ${processedAttachments !== undefined ? JSON.stringify(processedAttachments) : (existingTask.processedAttachments ? JSON.stringify(existingTask.processedAttachments) : null)},
              "processedBy" = ${processedBy},
              "processedAt" = ${processedSubmissionAt}
          WHERE id = ${Number(updatedTask.linkedRequestId)}
        `;

        if (requestStatus === 'Processed' && extReq?.requesterEmail) {
          await triggerNotification('TASK_PROCESSED', { 
            ...updatedTask, 
            requesterEmail: extReq.requesterEmail 
          });
        }
      } catch (e) {
        console.error("Failed to sync ExternalRequest status:", e);
      }
    }

    return NextResponse.json(updatedTask, { status: 200 });
  } catch (error: any) {
    console.error("Task update error:", error);
    return NextResponse.json({ 
      message: `DB Error: ${error.message || "Unknown error"}`, 
      details: error.message,
      error: error.message 
    }, { status: 500 });
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
    const userRole = (session?.user as any)?.role;
    const isMasterAdmin = userEmail?.toLowerCase() === "pavanreddy@intellicar.in" || userRole === "ADMIN";

    if (!isMasterAdmin) {
      return NextResponse.json({ message: "Forbidden: Only Master Admin can delete tasks" }, { status: 403 });
    }

    await sql`DELETE FROM "Task" WHERE id = ${taskId}`;

    return NextResponse.json({ message: "Task deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to delete task", error: error.message }, { status: 500 });
  }
}
