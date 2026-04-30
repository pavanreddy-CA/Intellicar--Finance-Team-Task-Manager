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

    // Reset delete request flags
    const result = await sql`
      UPDATE "Task"
      SET 
        "deleteRequested" = FALSE,
        "deleteRequestReason" = NULL,
        "deleteRequestedBy" = NULL
      WHERE "id" = ${taskId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Task deletion request rejected", task: result[0] });
  } catch (error: any) {
    console.error("Reject task delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
