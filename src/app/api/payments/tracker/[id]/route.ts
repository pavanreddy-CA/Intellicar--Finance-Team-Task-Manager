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

    const data = await req.json();
    const { 
      isHold, holdReason, 
      editRequested, editRequestReason, 
      editApproved,
      actualDate, amountPaid 
    } = data;

    // Build update dynamic
    const updates: any = { updatedAt: new Date() };
    
    if (isHold !== undefined) {
      updates.isHold = isHold;
      if (holdReason !== undefined) updates.holdReason = holdReason;
    }
    
    if (editRequested !== undefined) {
      updates.editRequested = editRequested;
      if (editRequestReason !== undefined) updates.editRequestReason = editRequestReason;
    }
    
    if (editApproved !== undefined) {
      updates.editApproved = editApproved;
    }

    // Special handling for the "Pen" update (actualDate and amountPaid)
    if (actualDate !== undefined || amountPaid !== undefined) {
      updates.actualDate = actualDate ? new Date(actualDate) : null;
      updates.amountPaid = amountPaid ? Number(amountPaid) : null;
      // If date and amount are present, mark as paid. If cleared, maybe not.
      // User says: "If he delete payment date and amount, still he can update payment date and amount in future"
      updates.isPaid = !!(updates.actualDate && updates.amountPaid);
      
      // Once updated via "Pen", clear the edit approval flag
      if (editApproved === undefined) {
        updates.editApproved = false;
        updates.editRequested = false;
      }
    }

    const result = await sql`
      UPDATE "PaymentOccurrence"
      SET ${sql(updates)}
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error("Update payment occurrence error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
