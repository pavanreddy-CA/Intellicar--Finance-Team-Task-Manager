import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEmailFromName } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const taskId = parseInt(resolvedParams.id);
    const { reason, requestedBy } = await req.json();

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const userEmail = session.user?.email;
    const userRole = (session.user as any)?.role;
    
    const isMasterAdmin = userEmail === "pavanreddy@intellicar.in" || userRole === "ADMIN";
    const isOwner = getEmailFromName(existingTask.ownerName) === userEmail;
    const isReviewer = getEmailFromName(existingTask.reviewerName) === userEmail;

    if (!isMasterAdmin && !isOwner && !isReviewer) {
      return NextResponse.json({ message: "Forbidden: You don't have permission to edit this task" }, { status: 403 });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        editRequested: true,
        editRequestBy: requestedBy, // 'OWNER' or 'REVIEWER'
        editRequestReason: reason
      }
    });

    return NextResponse.json({ message: "Edit request sent successfully", task: updatedTask }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to send edit request", error: error.message }, { status: 500 });
  }
}
