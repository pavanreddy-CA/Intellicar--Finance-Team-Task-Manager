import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { recipientEmail, ccEmail, subject, body, attachments, attachmentName, attachmentBuffer, contentType } = await req.json();

    if (!recipientEmail) {
      return NextResponse.json({ message: "Recipient email is required" }, { status: 400 });
    }

    // Process attachments
    const processedAttachments = [];
    
    // Handle plural format
    if (attachments && Array.isArray(attachments)) {
      attachments.forEach((att: any) => {
        processedAttachments.push({
          filename: att.filename,
          content: Buffer.from(att.content, 'base64'),
          contentType: att.contentType
        });
      });
    }
    
    // Handle singular format (backwards compatibility)
    if (attachmentName && attachmentBuffer) {
      processedAttachments.push({
        filename: attachmentName,
        content: Buffer.from(attachmentBuffer, 'base64'),
        contentType: contentType || 'application/octet-stream'
      });
    }

    await sendEmail({
      to: recipientEmail,
      cc: ccEmail || undefined,
      subject: subject || "Shared Report from Finance Task Manager",
      html: body || `<p>Please find the requested reports attached.</p>`,
      attachments: processedAttachments
    });

    return NextResponse.json({ message: "Reports shared successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Share report error:", error);
    return NextResponse.json({ message: "Error sharing report", error: error.message }, { status: 500 });
  }
}
