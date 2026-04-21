import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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

    const losToCreate = data.map(lo => ({
      entity: lo.entity,
      dateOfIdentification: lo.dateOfIdentification ? new Date(lo.dateOfIdentification) : new Date(),
      learningOpportunity: lo.learningOpportunity,
      identifiedBy: lo.identifiedBy,
      committedBy: lo.committedBy,
      resolutionProvided: lo.resolutionProvided || "Pending",
      modeOfCommunication: lo.modeOfCommunication || "Email",
      emailSub: lo.emailSub || null,
      comments: lo.comments || null,
      createdByEmail: lo.createdByEmail || userEmail,
    }));

    const result = await prisma.learningOpportunity.createMany({
      data: losToCreate,
      skipDuplicates: true,
    });

    return NextResponse.json({ message: "Bulk import successful", count: result.count }, { status: 201 });
  } catch (error: any) {
    console.error("Bulk LO import failed", error);
    return NextResponse.json({ message: "Failed to import LOs", error: error.message }, { status: 500 });
  }
}
