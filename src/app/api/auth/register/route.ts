import { NextResponse, NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendEmail } from "@/lib/email";


export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const { name, email, password, department, employeeId } = await req.json();

    if (!name || !email || !password || !department || !employeeId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const existingUsers = await sql`
      SELECT id FROM "User" WHERE LOWER(email) = LOWER(${email}) LIMIT 1
    `;

    if (existingUsers.length > 0) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    // New users are created as PENDING (isApproved: false)
    const users = await sql`
      INSERT INTO "User" (id, name, email, password, department, "employeeId", "isApproved", role, "createdAt", "updatedAt")
      VALUES (${userId}, ${name}, ${email}, ${hashedPassword}, ${department}, ${employeeId}, false, 'USER', NOW(), NOW())
      RETURNING id, name, email
    `;
    const user = users[0];

    // Notify Admins
    try {
      const admins = await sql`
        SELECT email FROM "User" WHERE role = 'ADMIN'
      `;
      
      const adminEmails = admins.map(a => a.email).filter(Boolean) as string[];
      
      if (adminEmails.length > 0) {
        await sendEmail({
          to: adminEmails.join(", "),
          subject: "New Access Request Pending Approval",
          html: `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
              <div style="background: #2563eb; padding: 24px; color: white;">
                <h2 style="margin: 0; font-size: 20px;">New Access Request</h2>
              </div>
              <div style="padding: 24px;">
                <p>Hello Admin,</p>
                <p>A new user has requested access to the Finance Task Manager Hub.</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0;"><strong>Employee ID:</strong> ${employeeId}</p>
                  <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${name}</p>
                  <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
                  <p style="margin: 0;"><strong>Department:</strong> ${department}</p>
                </div>
                <p>Please log in to the <strong>Control Center > User Management</strong> to review and approve this request.</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://v0-finpulse.vercel.app'}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">Review Request</a>
              </div>
              <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
                © 2026 Intellicar Telematics. All rights reserved.
              </div>
            </div>
          `
        });
      }
    } catch (emailError) {
      console.error("FAILED TO NOTIFY ADMINS:", emailError);
    }

    return NextResponse.json({ 
      message: "Access request submitted successfully", 
      user: { id: user.id, name: user.name, email: user.email } 
    }, { status: 201 });

  } catch (error: any) {
    console.error("REGISTER ERROR:", error);
    return NextResponse.json({ message: "Something went wrong", error: error.message }, { status: 500 });
  }
}
