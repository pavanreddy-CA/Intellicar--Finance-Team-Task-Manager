import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

// POST /api/payments/tracker/[id]/pay
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sql = getDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session?.user as any)?.role;
    if (userRole === "VIEWER") {
      return NextResponse.json({ error: "Forbidden: Viewers cannot record payments" }, { status: 403 });
    }

    const { 
      actualDate, 
      amountPaid, 
      paidFromAccount, 
      utrNumber, 
      sendAdvice, 
      adviceRecipient, 
      adviceCC, 
      attachment 
    } = await req.json();

    if (!actualDate || !amountPaid) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }

    const result = await sql`
      UPDATE "PaymentOccurrence"
      SET 
        "actualDate" = ${new Date(actualDate)},
        "amountPaid" = ${Number(amountPaid)},
        "paidFromAccount" = ${paidFromAccount || null},
        "utrNumber" = ${utrNumber || null},
        "adviceShared" = ${sendAdvice ? true : false},
        "adviceRecipient" = ${adviceRecipient || null},
        "adviceCC" = ${adviceCC || null},
        "adviceAttachment" = ${attachment || null},
        "isPaid" = TRUE,
        "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    const occ = result[0];

    // Trigger Payment Advice Email if requested
    if (sendAdvice && adviceRecipient) {
      try {
        const { sendEmail } = await import("@/lib/email");
        
        // Fetch vendor info for the email
        const template = await sql`
          SELECT * FROM "PaymentTemplate" WHERE id = ${occ.templateId}
        `;
        const vendorName = template[0]?.vendorName || "Vendor";

        const subject = `Payment Advice_${vendorName}_${new Date(actualDate).toLocaleDateString('en-GB')}`;
        
        const html = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 24px; text-align: center;">
              <h2 style="margin: 0;">Payment Advice</h2>
              <p style="margin: 8px 0 0 0; opacity: 0.8;">Confirmation of successful disbursement</p>
            </div>
            <div style="padding: 24px;">
              <p>Dear <strong>${vendorName}</strong>,</p>
              <p>This is to inform you that a payment has been processed to your account. Please find the details below:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background: #f8fafc; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b; width: 40%;">Vendor Name</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${vendorName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Amount Paid</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #16a34a;">₹${Number(amountPaid).toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Payment Date</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${new Date(actualDate).toLocaleDateString('en-GB')}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: 600; color: #64748b;">UTR / Reference No.</td>
                  <td style="padding: 12px; font-weight: 700;">${utrNumber || 'N/A'}</td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 0.875rem;">If you have any questions regarding this payment, please contact our finance department.</p>
              
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #94a3b8; text-align: center;">
                This is a system-generated notification. Please do not reply to this email.
              </div>
            </div>
          </div>
        `;

        const mailAttachments = [];
        if (attachment) {
          // attachment is a data URL: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA...
          const parts = attachment.split(";base64,");
          if (parts.length === 2) {
            const contentType = parts[0].split(":")[1];
            const base64Data = parts[1];
            const extension = contentType.split("/")[1] || "png";
            mailAttachments.push({
              filename: `Payment_Receipt_${occ.id}.${extension}`,
              content: base64Data,
              encoding: 'base64'
            });
          }
        }

        await sendEmail({
          to: adviceRecipient,
          cc: adviceCC,
          subject,
          html,
          attachments: mailAttachments
        });
      } catch (mailError) {
        console.error("Failed to send payment advice email:", mailError);
        // We still return success for the payment record update
      }
    }

    return NextResponse.json(occ);
  } catch (error: any) {
    console.error("Mark as paid error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
