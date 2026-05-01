import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session || !session.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const sql = getDb();
    const resources = await sql`
      SELECT * FROM "LearningResource"
      ORDER BY "createdAt" DESC
    `;
    return NextResponse.json(resources);
  } catch (error) {
    console.error("Fetch resources error:", error);
    return NextResponse.json({ message: "Failed to fetch resources" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || !session.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.email === "pavanreddy@intellicar.in" || (session.user as any)?.role === "ADMIN";
  if (!isAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  try {
    const sql = getDb();
    const data = await req.json();
    const resource = await sql`
      INSERT INTO "LearningResource" (
        "name", "type", "url", "data", "uploadedBy", "createdAt", "updatedAt"
      )
      VALUES (
        ${data.name}, ${data.type}, ${data.url || null}, ${data.data || null}, 
        ${session.user.name || session.user.email}, NOW(), NOW()
      )
      RETURNING *
    `;
    return NextResponse.json(resource[0], { status: 201 });
  } catch (error: any) {
    console.error("Resource creation error:", error);
    return NextResponse.json({ message: "Failed to create resource", error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session || !session.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.email === "pavanreddy@intellicar.in" || (session.user as any)?.role === "ADMIN";
  if (!isAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

  try {
    const sql = getDb();
    await sql`DELETE FROM "LearningResource" WHERE "id" = ${parseInt(id)}`;
    return NextResponse.json({ message: "Resource deleted" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete resource" }, { status: 500 });
  }
}
