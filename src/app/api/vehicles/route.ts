import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = { companyId: session.user.companyId ?? "" };
  if (status === "active") where.isActive = true;

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: {
      assignedDriver: { select: { id: true, name: true, email: true } },
      _count: { select: { trips: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(vehicles);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { licensePlate, make, model, year, type, fuelType, odometer, isShared, assignedDriverId } =
    await req.json();

  if (!licensePlate || !make || !model || !year) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      licensePlate,
      make,
      model,
      year: Number(year),
      type: type ?? "SEDAN",
      fuelType: fuelType ?? "GASOLINE",
      odometer: Number(odometer ?? 0),
      isShared: Boolean(isShared),
      companyId: session.user.companyId!,
      assignedDriverId: assignedDriverId || undefined,
    },
  });

  return NextResponse.json(vehicle, { status: 201 });
}
