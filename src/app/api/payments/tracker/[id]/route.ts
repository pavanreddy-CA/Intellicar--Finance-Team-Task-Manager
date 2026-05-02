import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

// PATCH /api/payments/tracker/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log(`PATCH /api/payments/tracker/${id} called`);
    const sql = getDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session?.user as any)?.role;
    if (userRole === "VIEWER") {
      return NextResponse.json({ error: "Forbidden: Viewers cannot modify payment records" }, { status: 403 });
    }

    const data = await req.json();
    const { 
      isHold, holdReason, 
      isCancelled, cancelledReason,
      editRequested, editRequestReason, 
      editApproved,
      actualDate, amountPaid 
    } = data;

    // Build the update query manually since Neon's sql tagged template doesn't support the sql(obj) helper
    const result = await sql`
      UPDATE "PaymentOccurrence"
      SET 
        "isHold" = CASE WHEN ${isHold !== undefined} THEN ${isHold}::BOOLEAN ELSE "isHold" END,
        "holdReason" = CASE WHEN ${holdReason !== undefined} THEN ${holdReason}::TEXT ELSE "holdReason" END,
        "isCancelled" = CASE WHEN ${isCancelled !== undefined} THEN ${isCancelled}::BOOLEAN ELSE "isCancelled" END,
        "cancelledReason" = CASE WHEN ${cancelledReason !== undefined} THEN ${cancelledReason}::TEXT ELSE "cancelledReason" END,
        "editRequested" = CASE 
          WHEN ${editRequested !== undefined} THEN ${editRequested}::BOOLEAN 
          WHEN ${actualDate !== undefined || amountPaid !== undefined} THEN FALSE
          ELSE "editRequested" 
        END,
        "editRequestReason" = CASE WHEN ${editRequestReason !== undefined} THEN ${editRequestReason}::TEXT ELSE "editRequestReason" END,
        "editApproved" = CASE 
          WHEN ${editApproved !== undefined} THEN ${editApproved}::BOOLEAN 
          WHEN ${actualDate !== undefined || amountPaid !== undefined} THEN FALSE
          ELSE "editApproved" 
        END,
        "actualDate" = CASE WHEN ${actualDate !== undefined} THEN ${actualDate ? new Date(actualDate) : null}::DATE ELSE "actualDate" END,
        "amountPaid" = CASE WHEN ${amountPaid !== undefined} THEN ${amountPaid ? Number(amountPaid) : null}::NUMERIC ELSE "amountPaid" END,
        "isPaid" = CASE 
          WHEN ${actualDate !== undefined || amountPaid !== undefined} THEN (${(actualDate && amountPaid) ? true : false})::BOOLEAN
          ELSE "isPaid" 
        END,
        "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Notify on critical updates
    const updated = result[0];
    if (isHold || isCancelled || editApproved) {
      try {
        const { sendEmail } = await import("@/lib/email");
        let subject = "";
        let body = "";

        if (isHold) {
          subject = `Payment Put On HOLD: ${updated.vendorName}`;
          body = `The payment for <strong>${updated.vendorName}</strong> has been put on HOLD.<br/>Reason: ${holdReason}`;
        } else if (isCancelled) {
          subject = `Payment CANCELLED: ${updated.vendorName}`;
          body = `The payment for <strong>${updated.vendorName}</strong> has been CANCELLED.<br/>Reason: ${cancelledReason}`;
        } else if (editApproved) {
          subject = `Payment Edit APPROVED: ${updated.vendorName}`;
          body = `The edit request for <strong>${updated.vendorName}</strong> has been APPROVED by Admin.`;
        }

        if (subject) {
          await sendEmail({
            to: "pavanreddy@intellicar.in",
            subject,
            html: `
              <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: ${isCancelled ? '#ef4444' : '#2563eb'};">${subject}</h2>
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
                  <p><strong>Vendor:</strong> ${updated.vendorName}</p>
                  <p><strong>Description:</strong> ${updated.paymentDescription}</p>
                  <p><strong>Due Date:</strong> ${new Date(updated.dueDate).toLocaleDateString('en-GB')}</p>
                  <p>${body}</p>
                  <p><strong>Updated By:</strong> ${session.user.name || session.user.email}</p>
                </div>
              </div>
            `
          });
        }
      } catch (mailErr) {
        console.error("Critical update email failed:", mailErr);
      }
    }

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error("Update payment occurrence error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
