import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";
import { triggerNotification } from "@/services/notificationService";


// Using session name directly

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session || !session.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");

  const isAdmin = session?.user?.email === "pavanreddy@intellicar.in" || (session?.user as any)?.role === "ADMIN";
  const shortName = session.user.name || "";

  try {
    const sql = getDb();
    const dbFromDate = fromDate ? new Date(fromDate).toISOString() : '1970-01-01';
    const dbToDate = toDate ? new Date(toDate).toISOString() : '9999-12-31';

    const los = await sql`
      SELECT * FROM "LearningOpportunity"
      WHERE (
        ${isAdmin} = true OR 
        ("createdByEmail" = ${session.user.email} OR "identifiedBy" = ${shortName} OR "committedBy" = ${shortName})
      )
      AND (${fromDate === null} = true OR "dateOfIdentification" >= ${dbFromDate})
      AND (${toDate === null} = true OR "dateOfIdentification" <= ${dbToDate})
      ORDER BY "createdAt" DESC
    `;
    
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

  const userRole = (session?.user as any)?.role;
  if (userRole === "VIEWER") {
    return NextResponse.json({ message: "Forbidden: Viewers cannot acknowledge LOs" }, { status: 403 });
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
        "acknowledgedBy" = ${session.user.name || session.user.email},
        "updatedAt" = NOW()
      WHERE "id" = ${id}
      RETURNING *
    `;

    if (updated.length === 0) return NextResponse.json({ message: "LO not found" }, { status: 404 });

    // Trigger Notification
    await triggerNotification('LO_ACKNOWLEDGED', updated[0]);

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

  const userRole = (session?.user as any)?.role;
  if (userRole === "VIEWER") {
    return NextResponse.json({ message: "Forbidden: Viewers cannot create LOs" }, { status: 403 });
  }

  try {
    const sql = getDb();

    try {
      await sql`ALTER TABLE "LearningOpportunity" ADD COLUMN IF NOT EXISTS "taskId" INTEGER`;
    } catch (e) {
      console.log("Migration check failed silently", e);
    }

    const data = await req.json();
    const los = await sql`
      INSERT INTO "LearningOpportunity" (
        "entity", "dateOfIdentification", "learningOpportunity", "identifiedBy",
        "committedBy", "resolutionProvided", "modeOfCommunication", "emailSub",
        "comments", "createdByEmail", "createdAt", "updatedAt",
        "isAcknowledged", "taskId"
      )
      VALUES (
        ${data.entity}, ${new Date(data.dateOfIdentification).toISOString()}, 
        ${data.learningOpportunity}, ${data.identifiedBy},
        ${data.committedBy}, ${data.resolutionProvided}, ${data.modeOfCommunication}, 
        ${data.emailSub || null}, ${data.comments || null}, ${session.user.email}, NOW(), NOW(),
        false, ${data.taskId || null}
      )
      RETURNING *
    `;
    
    // Trigger Notification
    await triggerNotification('LO_CREATED', los[0]);

    return NextResponse.json(los[0], { status: 201 });
  } catch (error: any) {
    console.error("LO creation error:", error);
    return NextResponse.json({ message: "Failed to create LO", error: error.message }, { status: 500 });
  }
}
