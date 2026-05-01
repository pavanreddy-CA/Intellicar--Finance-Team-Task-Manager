import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";


// Using session name directly

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session || !session.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");

  const isAdmin = session.user.email === "pavanreddy@intellicar.in" || (session.user as any)?.role === "ADMIN";
  const shortName = session.user.name || "";

  try {
    const sql = getDb();
    let query = `SELECT * FROM "LearningOpportunity" WHERE 1=1`;
    const params: any[] = [];

    if (!isAdmin) {
      query += ` AND ("createdByEmail" = $${params.length + 1} OR "identifiedBy" = $${params.length + 2} OR "committedBy" = $${params.length + 3})`;
      params.push(session.user.email, shortName, shortName);
    }

    if (fromDate) {
      query += ` AND "dateOfIdentification" >= $${params.length + 1}`;
      params.push(new Date(fromDate).toISOString());
    }
    if (toDate) {
      query += ` AND "dateOfIdentification" <= $${params.length + 1}`;
      params.push(new Date(toDate).toISOString());
    }

    query += ` ORDER BY "createdAt" DESC`;
    
    const los = await (sql as any).unsafe(query, params);
    return NextResponse.json(los);
  } catch (error) {
    console.error("Fetch LOs error:", error);
    return NextResponse.json({ message: "Failed to fetch LOs" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const sql = getDb();
    const { id, isAcknowledged, learnerComments } = await req.json();

    if (!id) return NextResponse.json({ message: "ID is required" }, { status: 400 });

    // Check if already acknowledged to "lock" it
    const existing = await sql`SELECT "isAcknowledged" FROM "LearningOpportunity" WHERE "id" = ${id}`;
    if (existing.length > 0 && existing[0].isAcknowledged) {
      return NextResponse.json({ message: "This LO is already acknowledged and locked." }, { status: 403 });
    }

    const updated = await sql`
      UPDATE "LearningOpportunity"
      SET 
        "isAcknowledged" = ${isAcknowledged},
        "learnerComments" = ${learnerComments},
        "acknowledgedAt" = NOW(),
        "updatedAt" = NOW()
      WHERE "id" = ${id}
      RETURNING *
    `;

    if (updated.length === 0) return NextResponse.json({ message: "LO not found" }, { status: 404 });

    return NextResponse.json(updated[0]);
  } catch (error: any) {
    console.error("LO acknowledgment error:", error);
    return NextResponse.json({ message: "Failed to acknowledge LO", error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const sql = getDb();
    const data = await req.json();
    const los = await sql`
      INSERT INTO "LearningOpportunity" (
        "entity", "dateOfIdentification", "learningOpportunity", "identifiedBy",
        "committedBy", "resolutionProvided", "modeOfCommunication", "emailSub",
        "comments", "createdByEmail", "createdAt", "updatedAt",
        "isAcknowledged"
      )
      VALUES (
        ${data.entity}, ${new Date(data.dateOfIdentification).toISOString()}, 
        ${data.learningOpportunity}, ${data.identifiedBy},
        ${data.committedBy}, ${data.resolutionProvided}, ${data.modeOfCommunication}, 
        ${data.emailSub}, ${data.comments}, ${session.user.email}, NOW(), NOW(),
        false
      )
      RETURNING *
    `;
    return NextResponse.json(los[0], { status: 201 });
  } catch (error: any) {
    console.error("LO creation error:", error);
    return NextResponse.json({ message: "Failed to create LO", error: error.message }, { status: 500 });
  }
}
