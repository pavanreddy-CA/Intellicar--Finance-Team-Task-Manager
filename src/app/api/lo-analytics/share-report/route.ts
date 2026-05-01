import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { to, cc, subject, html, attachments } = await req.json();

    if (!to) {
      return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
    }

    await sendEmail({
      to,
      cc: cc || undefined,
      subject: subject || "LO Analytics Report",
      html,
      attachments: attachments || [],
    });

    return NextResponse.json({ success: true, message: "Report shared successfully" });
  } catch (error: any) {
    console.error("LO Analytics share error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
