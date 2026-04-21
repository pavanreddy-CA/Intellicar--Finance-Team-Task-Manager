import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { reason } = await req.json();
    const loId = parseInt(id);

    await prisma.learningOpportunity.update({
      where: { id: loId },
      data: {
        editRequested: true,
        editRequestReason: reason
      }
    });

    return NextResponse.json({ message: "Edit request sent" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to request edit" }, { status: 500 });
  }
}
