import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';


export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sql = getDb();
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await request.json();
    
    // Self-healing migration: Ensure column exists without crashing the request
    try {
      await sql`ALTER TABLE "ExternalRequest" ADD COLUMN IF NOT EXISTS "transferredBy" TEXT`;
    } catch (e) {
      console.log("Migration check skipped or already exists");
    }
    
    // Fetch current state first if we need to check for transfers
    let currentRequest = null;
    if (body.requestType !== undefined) {
      const existing = await sql`SELECT "requestType", "originalRequestType" FROM "ExternalRequest" WHERE id = ${id}`;
      currentRequest = existing[0];
    }

    const updateData: any = {};
    
    if (body.status !== undefined) updateData.status = body.status;
    if (body.convertedTaskId !== undefined) updateData.convertedTaskId = body.convertedTaskId;
    if (body.rejectReason !== undefined) updateData.rejectReason = body.rejectReason;
    
    if (body.requestType !== undefined) {
      updateData.requestType = body.requestType;
      // If the new requestType is different from the originalRequestType, it's a transfer
      if (currentRequest && body.requestType !== currentRequest.originalRequestType) {
        updateData.transferStatus = 'T';
      }
    }
    
    if (body.transferredBy !== undefined) {
      updateData.transferredBy = body.transferredBy;
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }
    
    // Manually build the update query for Neon Serverless compatibility
    // and explicitly quote column names for case-sensitivity
    const entries = Object.entries(updateData);
    const setClause = entries.map(([key], index) => `"${key}" = $${index + 1}`).join(', ');
    const values = entries.map(([, val]) => val);
    
    const query = `
      UPDATE "ExternalRequest"
      SET ${setClause}, "updatedAt" = NOW()
      WHERE id = $${values.length + 1}
      RETURNING *
    `;
    
    const result = await (sql as any).query(query, [...values, id]);
    const updatedRequest = result[0];
    
    return NextResponse.json(updatedRequest);
  } catch (error: any) {
    console.error('Error updating external request:', error);
    return NextResponse.json({ 
      message: 'Failed to transfer request', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sql = getDb();
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    await sql`DELETE FROM "ExternalRequest" WHERE id = ${id}`;
    
    return NextResponse.json({ message: "Request deleted successfully" });
  } catch (error) {
    console.error('Error deleting external request:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
