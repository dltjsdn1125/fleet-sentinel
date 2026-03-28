import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { reverseGeocode } from "@/lib/geocode";

const MAX_ACCURACY_M = 50; // 50m 이상 오차 좌표 폐기

// POST: GPS 좌표 배치 업로드
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { tripId, points } = await req.json();

    if (!tripId || !Array.isArray(points)) {
      return NextResponse.json({ error: "tripId와 points 필수" }, { status: 400 });
    }

    // 운행 소유 확인
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, driverId: session.user.id },
    });
    if (!trip) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    // 정확도 필터: 50m 초과 폐기
    const validPoints = points.filter(
      (p: { lat: number; lng: number; accuracy: number }) =>
        typeof p.lat === "number" &&
        typeof p.lng === "number" &&
        typeof p.accuracy === "number" &&
        p.accuracy <= MAX_ACCURACY_M
    );

    // 속도 기반 이상 점프 필터 (3초에 500m 이상 이동 불가)
    const filtered: typeof validPoints = [];
    for (let i = 0; i < validPoints.length; i++) {
      if (i === 0) { filtered.push(validPoints[i]); continue; }
      const prev = filtered[filtered.length - 1];
      const dt = (new Date(validPoints[i].timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
      const dist = haversineM(prev.lat, prev.lng, validPoints[i].lat, validPoints[i].lng);
      const maxSpeedMps = 60; // 216 km/h (최대 허용)
      if (dt > 0 && dist / dt > maxSpeedMps) continue; // 이상 점프 제거
      filtered.push(validPoints[i]);
    }

    if (filtered.length > 0) {
      await prisma.gpsPoint.createMany({
        data: filtered.map((p: { lat: number; lng: number; accuracy: number; speed?: number; heading?: number; timestamp: string }) => ({
          tripId,
          lat: p.lat,
          lng: p.lng,
          accuracy: p.accuracy,
          speed: p.speed,
          heading: p.heading,
          timestamp: new Date(p.timestamp),
        })),
      });
    }

    return NextResponse.json({
      received: points.length,
      valid: filtered.length,
      discarded: points.length - filtered.length,
    });
  } catch (err) {
    console.error("GPS upload error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// 출발지/도착지 역지오코딩
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lat, lng } = await req.json();
  const address = await reverseGeocode(lat, lng);
  return NextResponse.json({ address });
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
