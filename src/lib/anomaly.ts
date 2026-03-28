import { Trip } from "@prisma/client";

export type AnomalyFlag = {
  reason: string;
  severity: "warning" | "critical";
};

/**
 * 이상 운행 감지 규칙
 */
export function detectAnomalies(trip: Partial<Trip>): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];

  // 1. 운행 목적 24시간 미입력 (completed 상태인데 purpose 없음)
  if (trip.status === "COMPLETED" && !trip.purpose) {
    flags.push({ reason: "운행 목적 미입력 (24시간 초과)", severity: "warning" });
  }

  // 2. 단일 운행 500km 초과
  if ((trip.distanceKm ?? 0) > 500) {
    flags.push({ reason: `단일 운행 거리 초과 (${trip.distanceKm?.toFixed(1)}km)`, severity: "warning" });
  }

  // 3. 새벽 2~5시 운행
  if (trip.startTime) {
    const hour = new Date(trip.startTime).getHours();
    if (hour >= 2 && hour < 5) {
      flags.push({ reason: `새벽 운행 감지 (${hour}시)`, severity: "warning" });
    }
  }

  return flags;
}

/**
 * Kalman Filter 기반 GPS 좌표 스무딩
 */
export function kalmanFilter(points: { lat: number; lng: number; accuracy: number }[]) {
  if (points.length === 0) return [];

  const Q = 0.00001; // process noise
  const smoothed = [points[0]];

  let pLat = 1, pLng = 1;
  let xLat = points[0].lat, xLng = points[0].lng;

  for (let i = 1; i < points.length; i++) {
    const R = Math.pow(points[i].accuracy / 111000, 2); // convert meters to degrees

    pLat = pLat + Q;
    pLng = pLng + Q;

    const kLat = pLat / (pLat + R);
    const kLng = pLng / (pLng + R);

    xLat = xLat + kLat * (points[i].lat - xLat);
    xLng = xLng + kLng * (points[i].lng - xLng);

    pLat = (1 - kLat) * pLat;
    pLng = (1 - kLng) * pLng;

    smoothed.push({ ...points[i], lat: xLat, lng: xLng });
  }

  return smoothed;
}

/**
 * 두 좌표 간 거리 계산 (Haversine, km)
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * GPS 경로 총 거리 계산
 */
export function calcTotalDistance(points: { lat: number; lng: number }[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineKm(
      points[i - 1].lat, points[i - 1].lng,
      points[i].lat, points[i].lng
    );
  }
  return Math.round(total * 10) / 10;
}
