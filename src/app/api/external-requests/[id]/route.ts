import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await request.json();
    
    const updatedRequest = await prisma.externalRequest.update({
      where: { id },
      data: body
    });

    // If status is updated to Processed, and there's a linked task, we might want to update the task too?
    // But the requirement says Task -> Request sync. 
    // Request -> Task sync is usually only at creation.
    
    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error updating external request:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
