import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getServerSession } from "@/lib/session";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const taskId = parseInt(resolvedParams.id);
    const { action } = await req.json(); // "APPROVE" or "REJECT"

    const existingTasks = await sql`SELECT * FROM "Task" WHERE id = ${taskId}`;
    const existingTask = existingTasks[0];
    
    if (!existingTask) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const userEmail = session.user?.email;
    const userRole = (session.user as any)?.role;
    
    // Only Admin can approve edit requests
    const isAdmin = userEmail === "pavanreddy@intellicar.in" || userRole === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json({ message: "Forbidden: Only Admin can approve edit requests" }, { status: 403 });
    }

    let updatedTask;
    
    if (action === "APPROVE") {
      if (existingTask.editRequestBy === "OWNER") {
        updatedTask = await sql`
          UPDATE "Task"
          SET "editRequested" = false, "editRequestBy" = null, "editRequestReason" = null,
              "taskStatus" = 'Pending', "completionDate" = null, 
              "reviewStatus" = 'Task Pending From Owner', "reviewCompletionDate" = null
          WHERE id = ${taskId}
          RETURNING *
        `;
      } else if (existingTask.editRequestBy === "REVIEWER") {
        updatedTask = await sql`
          UPDATE "Task"
          SET "editRequested" = false, "editRequestBy" = null, "editRequestReason" = null,
              "reviewStatus" = 'Pending', "reviewCompletionDate" = null
          WHERE id = ${taskId}
          RETURNING *
        `;
      } else {
        updatedTask = await sql`
          UPDATE "Task"
          SET "editRequested" = false, "editRequestBy" = null, "editRequestReason" = null
          WHERE id = ${taskId}
          RETURNING *
        `;
      }
    } else {
      updatedTask = await sql`
        UPDATE "Task"
        SET "editRequested" = false, "editRequestBy" = null, "editRequestReason" = null
        WHERE id = ${taskId}
        RETURNING *
      `;
    }

    return NextResponse.json({ message: `Edit request ${action.toLowerCase()}d successfully`, task: updatedTask[0] }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to process edit request", error: error.message }, { status: 500 });
  }
}
