import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getServerSession } from "@/lib/session";
import { sendEmail } from "@/lib/email";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { comment } = await req.json();
    const taskId = Number(resolvedParams.id);

    const tasks = await sql`SELECT * FROM "Task" WHERE id = ${taskId}`;
    const task = tasks[0];

    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const adminEmail = "pavanreddy@intellicar.in";
    const userName = (session.user as any)?.name || session.user?.email || "User";

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #ef4444; margin-top: 0;">Task Deletion Request</h2>
        <p>User <strong>${userName}</strong> has requested to delete the following task:</p>
        
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; margin: 20px 0; font-size: 14px;">
          <tr><td style="background: #f8fafc; width: 30%; font-weight: bold;">Task ID</td><td>#${task.id}</td></tr>
          <tr><td style="background: #f8fafc; font-weight: bold;">Task Name</td><td>${task.taskName}</td></tr>
          <tr><td style="background: #f8fafc; font-weight: bold;">Owner</td><td>${task.ownerName}</td></tr>
          <tr><td style="background: #f8fafc; font-weight: bold;">Reviewer</td><td>${task.reviewerName || "N/A"}</td></tr>
        </table>

        <div style="background: #fef2f2; padding: 16px; border-radius: 6px; border-left: 4px solid #ef4444;">
          <h4 style="margin: 0 0 8px 0; color: #b91c1c;">Deletion Reason / Comment:</h4>
          <p style="margin: 0; color: #7f1d1d; white-space: pre-wrap;">${comment || "No comment provided."}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://intellicar-finance-team-task-manage-one.vercel.app/" style="background: #ef4444; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Login to Admin Dashboard</a>
        </div>

        <p style="margin-top: 24px; font-size: 13px; color: #64748b; text-align: center;">You can review and approve this request in the Admin Options panel.</p>
      </div>
    `;

    await sql`
      UPDATE "Task"
      SET "deleteRequested" = true, "deleteRequestReason" = ${comment}
      WHERE id = ${taskId}
    `;

    await sendEmail({
      to: adminEmail,
      subject: `Task Deletion Request: #${task.id} - ${task.taskName}`,
      html,
    });

    return NextResponse.json({ message: "Deletion request sent to admin." }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to request delete:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
