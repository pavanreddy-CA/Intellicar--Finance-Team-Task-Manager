import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sql = getDb();
    const resolvedParams = await params;
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { comment } = await req.json();
    const loId = Number(resolvedParams.id);

    const loRecords = await sql`SELECT * FROM "LearningOpportunity" WHERE id = ${loId}`;
    const lo = loRecords[0];

    if (!lo) {
      return NextResponse.json({ message: "LO entry not found" }, { status: 404 });
    }

    const adminEmail = "pavanreddy@intellicar.in";
    const userName = (session.user as any)?.name || session.user?.email || "User";

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #ef4444; margin-top: 0;">LO Deletion Request</h2>
        <p>User <strong>${userName}</strong> has requested to delete the following Learning Opportunity:</p>
        
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; margin: 20px 0; font-size: 14px;">
          <tr><td style="background: #f8fafc; width: 30%; font-weight: bold;">LO ID</td><td>#${lo.id}</td></tr>
          <tr><td style="background: #f8fafc; font-weight: bold;">Entity</td><td>${lo.entity}</td></tr>
          <tr><td style="background: #f8fafc; font-weight: bold;">Description</td><td>${lo.learningOpportunity}</td></tr>
          <tr><td style="background: #f8fafc; font-weight: bold;">Identified By</td><td>${lo.identifiedBy}</td></tr>
        </table>

        <div style="background: #fef2f2; padding: 16px; border-radius: 6px; border-left: 4px solid #ef4444;">
          <h4 style="margin: 0 0 8px 0; color: #b91c1c;">Deletion Reason / Comment:</h4>
          <p style="margin: 0; color: #7f1d1d; white-space: pre-wrap;">${comment || "No comment provided."}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://v0-finpulse.vercel.app/'}" style="background: #ef4444; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Login to Admin Dashboard</a>
        </div>

        <p style="margin-top: 24px; font-size: 13px; color: #64748b; text-align: center;">You can review and approve this request in the Admin Options panel.</p>
      </div>
    `;

    await sql`
      UPDATE "LearningOpportunity"
      SET "deleteRequested" = true, "deleteRequestReason" = ${comment}
      WHERE id = ${loId}
    `;

    await sendEmail({
      to: adminEmail,
      subject: `LO Deletion Request: #${lo.id} - ${lo.entity}`,
      html,
    });

    return NextResponse.json({ message: "Deletion request sent to admin." }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to request delete LO:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
