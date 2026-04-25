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
  try {
    const sql = getDb();
    const body = await request.json();
    const { requestFrom, requesterEmail, natureOfRequest, departmentName, requestType } = body;

    if (!requestFrom || !requesterEmail || !natureOfRequest || !departmentName || !requestType) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const newRequests = await sql`
      INSERT INTO "ExternalRequest" (
        "requestFrom", "requesterEmail", "natureOfRequest", "departmentName", 
        "requestType", "originalRequestType", "transferStatus", "status", "createdAt", "updatedAt"
      )
      VALUES (
        ${requestFrom}, ${requesterEmail}, ${natureOfRequest}, ${departmentName},
        ${requestType}, ${requestType}, 'O', 'Pending', NOW(), NOW()
      )
      RETURNING *
    `;

    return NextResponse.json(newRequests[0], { status: 201 });
  } catch (error) {
    console.error('Error creating external request:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
