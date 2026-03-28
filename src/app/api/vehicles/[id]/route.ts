import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH: 차량 정보 수정 (odometer 등)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const vehicle = await prisma.vehicle.findFirst({
    where: { id, companyId: session.user.companyId ?? "" },
  });
  if (!vehicle) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const updated = await prisma.vehicle.update({
    where: { id },
    data: {
      ...(body.odometer !== undefined && { odometer: Number(body.odometer) }),
      ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
      ...(body.assignedDriverId !== undefined && { assignedDriverId: body.assignedDriverId || null }),
    },
  });

  return NextResponse.json(updated);
}
