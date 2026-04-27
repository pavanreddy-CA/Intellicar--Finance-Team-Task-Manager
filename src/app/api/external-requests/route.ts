import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';


export async function GET(request: Request) {
  try {
    const sql = getDb();
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const department = searchParams.get('department');
    const role = searchParams.get('role');

    let requests: any[] = [];

    // Logic:
    // If Admin, see all.
    // If Finance member and has allocation rights (handled by frontend filtering or we could do it here), see relevant ones.
    // If External user, see only their own.
    
    if (role === 'ADMIN' || department === 'Finance') {
      // Admin and Finance team sees everything
      requests = await sql`
        SELECT * FROM "ExternalRequest"
        ORDER BY "createdAt" DESC
      `;
    } else if (email) {
      // External users only see their own requests
      requests = await sql`
        SELECT * FROM "ExternalRequest"
        WHERE "requesterEmail" = ${email}
        ORDER BY "createdAt" DESC
      `;
    } else {
      requests = [];
    }
    
    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching external requests:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { requestFrom, requesterEmail, natureOfRequest, departmentName, requestType, entityNames, frequency } = body;

  try {
    const sql = getDb();
    
    // Self-healing migration
    try {
      await sql`ALTER TABLE "ExternalRequest" ADD COLUMN IF NOT EXISTS "entityName" TEXT`;
      await sql`ALTER TABLE "ExternalRequest" ADD COLUMN IF NOT EXISTS "originalRequestType" TEXT`;
      await sql`ALTER TABLE "ExternalRequest" ADD COLUMN IF NOT EXISTS "transferStatus" TEXT DEFAULT 'O'`;
      await sql`ALTER TABLE "ExternalRequest" ADD COLUMN IF NOT EXISTS "transferredBy" TEXT`;
      await sql`ALTER TABLE "ExternalRequest" ADD COLUMN IF NOT EXISTS "frequency" TEXT`;
    } catch (e) {
      console.log("ExternalRequest migration check failed/skipped");
    }

    if (!requestFrom || !requesterEmail || !natureOfRequest || !departmentName || !requestType || !entityNames || !entityNames.length) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const createdRequests = [];
    for (const entityName of entityNames) {
      const result = await sql`
        INSERT INTO "ExternalRequest" (
          "requestFrom", "requesterEmail", "natureOfRequest", "departmentName", 
          "requestType", "originalRequestType", "transferStatus", "status", "entityName", "frequency", "createdAt", "updatedAt"
        )
        VALUES (
          ${requestFrom}, ${requesterEmail}, ${natureOfRequest}, ${departmentName},
          ${requestType}, ${requestType}, 'O', 'Pending', ${entityName}, ${frequency || null}, NOW(), NOW()
        )
        RETURNING *
      `;
      createdRequests.push(result[0]);
    }

    return NextResponse.json(createdRequests, { status: 201 });
  } catch (error: any) {
    console.error('Error creating external request:', error);
    console.error('External Request Full Data:', { requestFrom, requesterEmail, natureOfRequest, departmentName, requestType, entityNames });
    console.error('Error Details:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
