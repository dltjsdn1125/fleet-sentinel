import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

  const reports = await (prisma as any).report.findMany({
    where: isAdmin
      ? { companyId: session.user.companyId ?? "" }
      : { driverId: session.user.id },
    include: {
      driver: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(reports);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, periodStart, periodEnd, content } = body;

  if (!type || !periodStart || !periodEnd) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const start = new Date(periodStart);
  const end   = new Date(periodEnd);
  end.setHours(23, 59, 59, 999);

  // 기간 내 운행·경비 자동 집계
  const [tripAgg, expenseAgg] = await Promise.all([
    prisma.trip.aggregate({
      where: {
        driverId: session.user.id,
        date: { gte: start, lte: end },
        status: { in: ["COMPLETED", "APPROVED"] },
      },
      _count: true,
      _sum: { distanceKm: true },
    }),
    prisma.expense.aggregate({
      where: {
        driverId: session.user.id,
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
  ]);

  const report = await (prisma as any).report.create({
    data: {
      type,
      periodStart: start,
      periodEnd:   end,
      content:     content ?? null,
      totalTrips:  tripAgg._count,
      totalKm:     tripAgg._sum.distanceKm ?? 0,
      totalExpenses: expenseAgg._sum.amount ?? 0,
      driverId:    session.user.id,
      companyId:   session.user.companyId ?? "",
    },
  });

  return NextResponse.json(report, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, status } = await req.json();

  const updated = await (prisma as any).report.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(updated);
}
