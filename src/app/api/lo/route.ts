import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getServerSession } from "@/lib/session";

const sql = neon(process.env.DATABASE_URL!);

const EMAIL_TO_NAME: Record<string, string> = {
  "pavanreddy@intellicar.in": "Pavan",
  "saikatdas@intellicar.in": "Saikath",
  "sami@intellicar.in": "Sami",
  "hanusha@intellicar.in": "Hanusha",
  "sreenivasulu.t@intellicar.in": "Sreenivas",
  "sharath.shetty@intellicar.in": "Sharath",
  "chandanak@intellicar.in": "Chandana",
  "nikhat@intellicar.in": "Nikhat",
  "venkata.g@intellicar.in": "Venkat",
  "saneja@intellicar.in": "Siddharth"
};

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || !session.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.email === "pavanreddy@intellicar.in" || (session.user as any)?.role === "ADMIN";
  const shortName = EMAIL_TO_NAME[session.user.email] || session.user.name || "";

  try {
    let los;
    if (isAdmin) {
      los = await sql`
        SELECT * FROM "LearningOpportunity"
        ORDER BY "createdAt" DESC
      `;
    } else {
      los = await sql`
        SELECT * FROM "LearningOpportunity"
        WHERE "createdByEmail" = ${session.user.email}
           OR "identifiedBy" = ${shortName}
           OR "committedBy" = ${shortName}
        ORDER BY "createdAt" DESC
      `;
    }
    return NextResponse.json(los);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch LOs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const los = await sql`
      INSERT INTO "LearningOpportunity" (
        "entity", "dateOfIdentification", "learningOpportunity", "identifiedBy",
        "committedBy", "resolutionProvided", "modeOfCommunication", "emailSub",
        "comments", "createdByEmail", "createdAt", "updatedAt"
      )
      VALUES (
        ${data.entity}, ${new Date(data.dateOfIdentification).toISOString()}, 
        ${data.learningOpportunity}, ${data.identifiedBy},
        ${data.committedBy}, ${data.resolutionProvided}, ${data.modeOfCommunication}, 
        ${data.emailSub}, ${data.comments}, ${session.user.email}, NOW(), NOW()
      )
      RETURNING *
    `;
    return NextResponse.json(los[0], { status: 201 });
  } catch (error: any) {
    console.error("LO creation error:", error);
    return NextResponse.json({ message: "Failed to create LO", error: error.message }, { status: 500 });
  }
}
