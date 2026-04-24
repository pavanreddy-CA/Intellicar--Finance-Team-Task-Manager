import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getServerSession } from "@/lib/session";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user?.email;
    const userRole = (session.user as any)?.role;
    if (userEmail !== "pavanreddy@intellicar.in" && userRole !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const data = await req.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ message: "Invalid data format. Expected an array of Learning Opportunities." }, { status: 400 });
    }

    let count = 0;
    for (const lo of data) {
      await sql`
        INSERT INTO "LearningOpportunity" (
          "entity", "dateOfIdentification", "learningOpportunity", "identifiedBy",
          "committedBy", "resolutionProvided", "modeOfCommunication", "emailSub",
          "comments", "createdByEmail", "createdAt", "updatedAt"
        )
        VALUES (
          ${lo.entity}, 
          ${lo.dateOfIdentification ? new Date(lo.dateOfIdentification).toISOString() : new Date().toISOString()},
          ${lo.learningOpportunity}, ${lo.identifiedBy}, ${lo.committedBy},
          ${lo.resolutionProvided || "Pending"}, ${lo.modeOfCommunication || "Email"},
          ${lo.emailSub || null}, ${lo.comments || null}, 
          ${lo.createdByEmail || userEmail}, NOW(), NOW()
        )
      `;
      count++;
    }

    return NextResponse.json({ message: "Bulk import successful", count }, { status: 201 });
  } catch (error: any) {
    console.error("Bulk LO import failed", error);
    return NextResponse.json({ message: "Failed to import LOs", error: error.message }, { status: 500 });
  }
}
