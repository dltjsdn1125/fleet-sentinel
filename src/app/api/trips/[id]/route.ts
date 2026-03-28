import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { detectAnomalies, calcTotalDistance, kalmanFilter } from "@/lib/anomaly";

// GET: 단일 운행 기록
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      driver: { select: { id: true, name: true, email: true } },
      vehicle: { select: { id: true, licensePlate: true, make: true, model: true, type: true } },
      gpsPoints: { orderBy: { timestamp: "asc" } },
    },
  });

  if (!trip) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  // 권한: 본인 또는 관리자
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin && trip.driverId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(trip);
}

// PATCH: 운행 기록 수정 (목적 입력, 도착 처리 등)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.trip.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  if (existing.isLocked) {
    return NextResponse.json({ error: "전자서명 확정된 기록은 수정할 수 없습니다." }, { status: 403 });
  }

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin && existing.driverId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const {
    endTime,
    endAddress,
    endLat,
    endLng,
    purpose,
    purposeCode,
    passengers,
    status,
    gpsPoints: newPoints,
  } = body;

  // 도착 처리 시 거리 계산
  let distanceKm = existing.distanceKm;
  let flagReason: string | null = existing.flagReason;
  let finalStatus = status ?? existing.status;

  if (endTime && newPoints && newPoints.length > 0) {
    const rawPoints = newPoints as { lat: number; lng: number; accuracy: number; speed?: number; timestamp: string | Date }[];
    const smoothed = kalmanFilter(rawPoints);
    distanceKm = calcTotalDistance(smoothed);

    // GPS 포인트 일괄 저장
    await prisma.gpsPoint.createMany({
      data: (smoothed as typeof rawPoints).map((p) => ({
        tripId: id,
        lat: p.lat,
        lng: p.lng,
        accuracy: p.accuracy,
        speed: p.speed,
        timestamp: new Date(p.timestamp),
      })),
    });
  }

  // 도착 처리 → COMPLETED
  if (endTime) finalStatus = "COMPLETED";

  // 이상 감지
  const anomalies = detectAnomalies({
    ...existing,
    status: finalStatus,
    purpose: purpose ?? existing.purpose,
    distanceKm,
    startTime: existing.startTime,
    endTime: endTime ? new Date(endTime) : existing.endTime,
  });

  if (anomalies.length > 0) {
    finalStatus = "FLAGGED";
    flagReason = anomalies.map((a) => a.reason).join("; ");
  }

  // 도착 처리 시 종료 계기판 km 계산 + 차량 오도미터 업데이트
  let endOdometer: number | undefined;
  if (endTime && distanceKm > 0) {
    const startOdo = (existing as any).startOdometer ?? 0;
    endOdometer = Math.round((startOdo + distanceKm) * 10) / 10;
    await prisma.vehicle.update({
      where: { id: existing.vehicleId },
      data: { odometer: endOdometer },
    });
  }

  const updated = await prisma.trip.update({
    where: { id },
    data: {
      endTime: endTime ? new Date(endTime) : undefined,
      endAddress,
      endLat,
      endLng,
      purpose,
      purposeCode,
      passengers,
      distanceKm,
      status: finalStatus,
      flagReason,
      ...(endOdometer !== undefined && { endOdometer }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE: 운행 기록 삭제 (관리자만)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.trip.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  if (existing.isLocked) {
    return NextResponse.json({ error: "확정된 기록은 삭제할 수 없습니다." }, { status: 403 });
  }

  await prisma.trip.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
