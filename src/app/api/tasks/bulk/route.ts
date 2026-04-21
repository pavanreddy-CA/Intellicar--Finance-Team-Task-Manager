import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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

    // Sanitize and format data
    const tasksToCreate = data.map(task => ({
      taskName: task.taskName,
      entityName: task.entityName,
      taskType: task.taskType || "General",
      departmentName: task.departmentName || "Finance",
      requestFrom: task.requestFrom || "Admin",
      ownerName: task.ownerName,
      reviewerName: task.reviewerName || "Not Applicable",
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      mailLink: task.mailLink || null,
      taskStatus: task.taskStatus || "Pending",
      reviewStatus: task.reviewStatus || (task.reviewerName && task.reviewerName !== "Not Applicable" ? "Task Pending From Owner" : "Review Not Required"),
      completionDate: task.completionDate ? new Date(task.completionDate) : null,
      reviewCompletionDate: task.reviewCompletionDate ? new Date(task.reviewCompletionDate) : null,
      ownerComments: task.ownerComments || null,
      reviewerComments: task.reviewerComments || null,
    }));

    const result = await prisma.task.createMany({
      data: tasksToCreate,
      skipDuplicates: true,
    });

    return NextResponse.json({ message: "Bulk import successful", count: result.count }, { status: 201 });
  } catch (error: any) {
    console.error("Bulk task import failed", error);
    return NextResponse.json({ message: "Failed to import tasks", error: error.message }, { status: 500 });
  }
}
