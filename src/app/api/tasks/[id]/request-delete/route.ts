import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { sendEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reason } = await req.json();
    if (!reason) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    const taskId = parseInt(id);
    const sql = getDb();

    // Update task with delete request info
    const result = await sql`
      UPDATE "Task"
      SET 
        "deleteRequested" = TRUE,
        "deleteRequestReason" = ${reason},
        "deleteRequestedBy" = ${session.user.email}
      WHERE "id" = ${taskId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Email Admin
    try {
      await sendEmail({
        to: "pavanreddy@intellicar.in",
        subject: `Task Deletion Request: ${result[0].title}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #ef4444;">Task Deletion Request</h2>
            <p>A deletion request has been submitted for a task.</p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
              <p><strong>Task ID:</strong> #${result[0].id}</p>
              <p><strong>Title:</strong> ${result[0].title}</p>
              <p><strong>Department:</strong> ${result[0].department}</p>
              <p><strong>Requested By:</strong> ${session.user.name || session.user.email}</p>
              <p><strong>Reason:</strong> ${reason}</p>
            </div>
            <p>Please review this request in the Control Center under <strong>Edit Requests > Delete Task</strong>.</p>
          </div>
        `
      });
    } catch (mailErr) {
      console.error("Failed to send task deletion request email:", mailErr);
    }

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error("Task request delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
