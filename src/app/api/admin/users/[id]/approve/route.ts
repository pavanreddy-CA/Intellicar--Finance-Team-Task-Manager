import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isApproved: true }
    });

    // Notify user of approval
    try {
      if (user.email) {
        await sendEmail({
          to: user.email,
          subject: "🎉 Your Account has been Approved!",
          html: `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
              <div style="background: #10b981; padding: 24px; color: white; text-align: center;">
                <h2 style="margin: 0; font-size: 24px;">Welcome to Finance Hub!</h2>
              </div>
              <div style="padding: 32px; text-align: center;">
                <p style="font-size: 18px;">Hello <strong>${user.name}</strong>,</p>
                <p>We are pleased to inform you that your access request has been approved by the Administrator.</p>
                <p>You can now log in to manage your tasks and collaborate with the team.</p>
                <a href="${process.env.NEXTAUTH_URL}" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; font-size: 16px;">Log In Now</a>
              </div>
              <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
                © 2026 Intellicar Telematics. All rights reserved.
              </div>
            </div>
          `
        });
      }
    } catch (emailError) {
      console.error("FAILED TO NOTIFY USER:", emailError);
    }

    return NextResponse.json({ message: "User approved successfully" });
  } catch (error: any) {
    console.error("APPROVE ERROR:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
