import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { reason } = await req.json();
    const loId = parseInt(id);

    const lo = await prisma.learningOpportunity.update({
      where: { id: loId },
      data: {
        editRequested: true,
        editRequestReason: reason
      }
    });

    // Send alert email to Admin
    const adminEmail = "pavanreddy@intellicar.in";
    const userName = session.user?.name || session.user?.email || "User";
    const dashboardUrl = "https://intellicar-finance-team-task-manage-one.vercel.app/";

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #2563eb; margin-top: 0;">LO Edit Request</h2>
        <p style="font-size: 16px; color: #334155;">User <strong>${userName}</strong> has requested to edit a Learning Opportunity:</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f1f5f9;">
          <table border="0" cellpadding="5" cellspacing="0" style="width: 100%; font-size: 14px;">
            <tr><td style="color: #64748b; width: 120px;">LO ID:</td><td style="color: #0f172a; font-weight: 600;">#${lo.id}</td></tr>
            <tr><td style="color: #64748b;">Entity:</td><td style="color: #0f172a;">${lo.entity}</td></tr>
          </table>
        </div>

        <div style="background: #eff6ff; padding: 16px; border-radius: 6px; border-left: 4px solid #2563eb; margin-bottom: 20px;">
          <h4 style="margin: 0 0 8px 0; color: #1e40af;">Reason for Edit:</h4>
          <p style="margin: 0; color: #1e3a8a; white-space: pre-wrap;">${reason || "No reason provided."}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" style="background: #2563eb; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Login to Admin Dashboard</a>
        </div>

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">This is an automated notification from Intellicar Finance Team Task Manager.</p>
      </div>
    `;

    // Send email asynchronously
    import("@/lib/email").then(({ sendEmail }) => {
      sendEmail({
        to: adminEmail,
        subject: `[LO Edit Request] #${lo.id} - ${lo.entity}`,
        html: emailHtml
      });
    });

    return NextResponse.json({ message: "Edit request sent" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to request edit" }, { status: 500 });
  }
}
