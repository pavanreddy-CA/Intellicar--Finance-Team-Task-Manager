import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    const isAdmin = session?.user.email === "pavanreddy@intellicar.in" || session?.user.role === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const taskId = parseInt(params.id);
    const sql = getDb();

    // Permanently delete the task
    const result = await sql`
      DELETE FROM "Task"
      WHERE "id" = ${taskId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Task permanently deleted", task: result[0] });
  } catch (error: any) {
    console.error("Approve task delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
