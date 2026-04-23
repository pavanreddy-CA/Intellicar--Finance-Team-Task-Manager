import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { recipientEmail, ccEmail, subject, body, attachmentName, attachmentBuffer, contentType } = await req.json();

    if (!recipientEmail) {
      return NextResponse.json({ message: "Recipient email is required" }, { status: 400 });
    }

    // Decode the base64 buffer
    const buffer = Buffer.from(attachmentBuffer, 'base64');

    await sendEmail({
      to: recipientEmail,
      subject: subject || "Shared Report from Finance Task Manager",
      html: body || `<p>Please find the requested report attached.</p>`,
      attachments: [
        {
          filename: attachmentName || "report.xlsx",
          content: buffer,
          contentType: contentType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
      ]
    });

    // Handle CC if provided (sendEmail might need update or we just send separately)
    if (ccEmail) {
        await sendEmail({
            to: ccEmail,
            subject: subject || "Shared Report from Finance Task Manager (CC)",
            html: body || `<p>Please find the requested report attached (CC).</p>`,
            attachments: [
              {
                filename: attachmentName || "report.xlsx",
                content: buffer,
                contentType: contentType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              }
            ]
          });
    }

    return NextResponse.json({ message: "Report shared successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Share report error:", error);
    return NextResponse.json({ message: "Error sharing report", error: error.message }, { status: 500 });
  }
}
