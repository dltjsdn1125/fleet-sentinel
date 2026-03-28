import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { detectAnomalies } from "@/lib/anomaly";

// GET: 운행 기록 목록 조회
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 20);
  const status = searchParams.get("status");
  const vehicleId = searchParams.get("vehicleId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const driverId = searchParams.get("driverId");

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

  const where: Record<string, unknown> = {};

  // 직원은 본인 기록만
  if (!isAdmin) {
    where.driverId = session.user.id;
  } else {
    // 관리자는 자기 회사 기록만
    where.driver = { companyId: session.user.companyId };
    if (driverId) where.driverId = driverId;
  }

  if (status) where.status = status;
  if (vehicleId) where.vehicleId = vehicleId;
  if (from || to) {
    where.date = {} as Record<string, Date>;
    if (from) (where.date as Record<string, Date>).gte = new Date(from);
    if (to) (where.date as Record<string, Date>).lte = new Date(to);
  }

  const [trips, total] = await Promise.all([
    prisma.trip.findMany({
      where,
      include: {
        driver: { select: { id: true, name: true, email: true } },
        vehicle: { select: { id: true, licensePlate: true, make: true, model: true } },
        _count: { select: { gpsPoints: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.trip.count({ where }),
  ]);

  return NextResponse.json({ trips, total, page, limit });
}

// POST: 운행 기록 생성
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      vehicleId,
      startTime,
      startAddress,
      startLat,
      startLng,
      isManualEntry,
    } = body;

    // 차량 권한 확인
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        companyId: session.user.companyId ?? "",
      },
    });
    if (!vehicle) return NextResponse.json({ error: "차량을 찾을 수 없습니다." }, { status: 404 });

    const trip = await prisma.trip.create({
      data: {
        date: new Date(startTime),
        startTime: new Date(startTime),
        startAddress: startAddress ?? `위치 정보 수집 중`,
        startLat,
        startLng,
        driverId: session.user.id,
        vehicleId,
        isManualEntry: isManualEntry ?? false,
        status: "PENDING",
        startOdometer: vehicle.odometer,  // 출발 시 현재 계기판 km 자동 기록
      },
    });

    return NextResponse.json(trip, { status: 201 });
  } catch (err) {
    console.error("Trip create error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
