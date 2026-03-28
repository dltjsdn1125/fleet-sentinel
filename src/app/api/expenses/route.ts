import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const category = searchParams.get("category");
  const vehicleId = searchParams.get("vehicleId");
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

  const where: Record<string, unknown> = isAdmin
    ? { companyId: session.user.companyId ?? "" }
    : { driverId: session.user.id };

  if (category) where.category = category;
  if (vehicleId) where.vehicleId = vehicleId;
  if (from || to) {
    where.date = {} as Record<string, Date>;
    if (from) (where.date as Record<string, Date>).gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      (where.date as Record<string, Date>).lte = toDate;
    }
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      vehicle: { select: { licensePlate: true, make: true, model: true } },
      driver: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  // 카테고리별 합계
  const summary = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({ expenses, summary, total: expenses.reduce((s, e) => s + e.amount, 0) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { vehicleId, date, category, amount, description, vendor, cardLast4, receiptNote, mileage, liters, pricePerL } = body;

  if (!vehicleId || !date || !category || !amount) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, companyId: session.user.companyId ?? "" },
  });
  if (!vehicle) return NextResponse.json({ error: "차량 없음" }, { status: 404 });

  const expense = await prisma.expense.create({
    data: {
      date: new Date(date),
      category,
      amount: Number(amount),
      description,
      vendor,
      cardLast4,
      receiptNote,
      mileage: mileage ? Number(mileage) : null,
      liters: liters ? Number(liters) : null,
      pricePerL: pricePerL ? Number(pricePerL) : null,
      vehicleId,
      driverId: session.user.id,
      companyId: session.user.companyId!,
    },
    include: {
      vehicle: { select: { licensePlate: true, make: true, model: true } },
      driver: { select: { name: true } },
    },
  });

  return NextResponse.json(expense, { status: 201 });
}
