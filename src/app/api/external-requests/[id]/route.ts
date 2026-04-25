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
    
    // Fetch current state first if we need to check for transfers
    let currentRequest = null;
    if (body.requestType !== undefined) {
      const existing = await sql`SELECT "requestType", "originalRequestType" FROM "ExternalRequest" WHERE id = ${id}`;
      currentRequest = existing[0];
    }

    const updates: string[] = [];
    
    if (body.status !== undefined) {
      updates.push(`status = '${body.status}'`);
    }
    if (body.convertedTaskId !== undefined) {
      updates.push(`"convertedTaskId" = ${body.convertedTaskId}`);
    }
    if (body.rejectReason !== undefined) {
      updates.push(`"rejectReason" = '${body.rejectReason}'`);
    }
    if (body.requestType !== undefined) {
      updates.push(`"requestType" = '${body.requestType}'`);
      // If the new requestType is different from the originalRequestType, it's a transfer
      if (currentRequest && body.requestType !== currentRequest.originalRequestType) {
        updates.push(`"transferStatus" = 'T'`);
      }
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }
    
    const query = `
      UPDATE "ExternalRequest"
      SET ${updates.join(', ')}, "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    const updatedRequests = await sql.unsafe(query) as unknown as any[];
    
    return NextResponse.json(updatedRequests[0]);
  } catch (error) {
    console.error('Error updating external request:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
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
