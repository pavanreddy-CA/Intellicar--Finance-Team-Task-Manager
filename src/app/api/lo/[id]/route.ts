import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const isAdmin = session?.user?.email === "pavanreddy@intellicar.in" || (session?.user as any)?.role === "ADMIN";
  const loId = parseInt(id);

  try {
    const existingLO = await prisma.learningOpportunity.findUnique({
      where: { id: loId }
    });

    if (!existingLO) return NextResponse.json({ message: "LO not found" }, { status: 404 });

    // Permissions: Admin can always edit. Owner can edit ONLY if approved.
    const isOwner = existingLO.createdByEmail === session.user?.email;
    if (!isAdmin && (!isOwner || !existingLO.editApproved)) {
      return NextResponse.json({ message: "You don't have permission to edit this LO" }, { status: 403 });
    }

    const data = await req.json();
    
    const updatedLO = await prisma.learningOpportunity.update({
      where: { id: loId },
      data: {
        entity: data.entity,
        dateOfIdentification: data.dateOfIdentification ? new Date(data.dateOfIdentification) : undefined,
        learningOpportunity: data.learningOpportunity,
        identifiedBy: data.identifiedBy,
        committedBy: data.committedBy,
        resolutionProvided: data.resolutionProvided,
        modeOfCommunication: data.modeOfCommunication,
        emailSub: data.emailSub,
        comments: data.comments,
        // Reset approval after user edits
        editApproved: isAdmin ? existingLO.editApproved : false 
      }
    });

    return NextResponse.json(updatedLO);
  } catch (error: any) {
    console.error("LO update error:", error);
    return NextResponse.json({ message: "Failed to update LO", error: error.message }, { status: 500 });
  }
}
