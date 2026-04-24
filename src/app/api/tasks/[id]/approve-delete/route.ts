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
    
    // Only Admin can approve delete requests
    const isAdmin = userEmail === "pavanreddy@intellicar.in" || userRole === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json({ message: "Forbidden: Only Admin can approve delete requests" }, { status: 403 });
    }

    if (action === "APPROVE") {
      await sql`DELETE FROM "Task" WHERE id = ${taskId}`;
      return NextResponse.json({ message: "Task deleted successfully" }, { status: 200 });
    } else {
      await sql`
        UPDATE "Task"
        SET "deleteRequested" = false, "deleteRequestReason" = null
        WHERE id = ${taskId}
      `;
      return NextResponse.json({ message: "Deletion request rejected successfully" }, { status: 200 });
    }
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to process delete request", error: error.message }, { status: 500 });
  }
}
