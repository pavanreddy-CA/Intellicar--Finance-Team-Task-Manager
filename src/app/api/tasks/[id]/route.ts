import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail, getEmailFromName } from "@/lib/email";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const taskId = parseInt(resolvedParams.id);
    const data = await req.json();

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
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
    let updates: any = {};

    if (data.taskStatus) {
      updates.taskStatus = data.taskStatus;
      
      if (data.taskStatus === "Completed" && !existingTask.completionDate) {
        updates.completionDate = new Date();
      }

      if (data.taskStatus === "Completed" && existingTask.taskStatus !== "Completed") {
        updates.reviewStatus = (existingTask.reviewerName === "Not Applicable" || !existingTask.reviewerName) 
          ? "Review Not Required" 
          : "Pending";
      } else if (data.taskStatus === "Pending") {
        updates.reviewStatus = "Task Pending From Owner";
        updates.reviewCompletionDate = null;
      }
    }

    if (data.reviewCompletionDate !== undefined) {
      if (data.reviewCompletionDate) {
        updates.reviewCompletionDate = new Date(data.reviewCompletionDate);
        updates.reviewStatus = "Completed";
      } else {
        updates.reviewCompletionDate = null;
        updates.reviewStatus = "Pending";
      }
    }

    if (data.ownerComments !== undefined) {
      updates.ownerComments = data.ownerComments;
    }

    if (data.reviewerComments !== undefined) {
      updates.reviewerComments = data.reviewerComments;
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updates
    });

    // Send email to reviewer if status just changed to Completed and review is required
    if (data.taskStatus === "Completed" && existingTask.taskStatus !== "Completed" && updatedTask.reviewStatus === "Pending") {
      const reviewerEmail = getEmailFromName(updatedTask.reviewerName);
      if (reviewerEmail) {
        const emailHtml = `
          <h2>Task Ready for Review: ${updatedTask.taskName}</h2>
          <p><strong>Owner:</strong> ${updatedTask.ownerName}</p>
          <p><strong>Entity:</strong> ${updatedTask.entityName}</p>
          <p>The owner has marked this task as completed. It is now pending your review.</p>
          <p>Please log in to the Task Manager Dashboard to complete your review.</p>
        `;
        sendEmail({ to: reviewerEmail, subject: `Task Ready for Review: ${updatedTask.taskName}`, html: emailHtml });
      }
    }

    return NextResponse.json(updatedTask, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to update task", error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
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

    await prisma.task.delete({ where: { id: taskId } });

    return NextResponse.json({ message: "Task deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to delete task", error: error.message }, { status: 500 });
  }
}
