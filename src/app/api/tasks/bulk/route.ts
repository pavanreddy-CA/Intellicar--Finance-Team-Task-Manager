import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getServerSession } from "@/lib/session";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
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

    let count = 0;
    for (const task of data) {
      const reviewerName = task.reviewerName || "Not Applicable";
      const reviewStatus = task.reviewStatus || (reviewerName !== "Not Applicable" ? "Task Pending From Owner" : "Review Not Required");
      
      await sql`
        INSERT INTO "Task" (
          "taskName", "entityName", "taskType", "departmentName", "requestFrom",
          "ownerName", "reviewerName", "dueDate", "mailLink", "taskStatus",
          "reviewStatus", "completionDate", "reviewCompletionDate", "ownerComments",
          "reviewerComments", "createdAt", "updatedAt"
        )
        VALUES (
          ${task.taskName}, ${task.entityName}, ${task.taskType || "General"}, 
          ${task.departmentName || "Finance"}, ${task.requestFrom || "Admin"},
          ${task.ownerName}, ${reviewerName}, 
          ${task.dueDate ? new Date(task.dueDate).toISOString() : null}, 
          ${task.mailLink || null}, ${task.taskStatus || "Pending"},
          ${reviewStatus}, 
          ${task.completionDate ? new Date(task.completionDate).toISOString() : null},
          ${task.reviewCompletionDate ? new Date(task.reviewCompletionDate).toISOString() : null},
          ${task.ownerComments || null}, ${task.reviewerComments || null},
          NOW(), NOW()
        )
      `;
      count++;
    }

    return NextResponse.json({ message: "Bulk import successful", count }, { status: 201 });
  } catch (error: any) {
    console.error("Bulk task import failed", error);
    return NextResponse.json({ message: "Failed to import tasks", error: error.message }, { status: 500 });
  }
}
