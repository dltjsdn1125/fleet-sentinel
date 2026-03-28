"use client";
import { useState, useRef, useCallback, useEffect } from "react";

export interface GpsPoint {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: string;
}

export type TrackingStatus =
  | "idle"
  | "waiting" // GPS 신호 대기
  | "tracking"
  | "stopped"
  | "error";

const GPS_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 8000,
};

const MAX_ACCURACY_M = 50;
const BATCH_INTERVAL_MS = 10_000; // 10초마다 서버 전송
const COLLECT_INTERVAL_MS = 5_000; // 5초마다 위치 수집
const STATIONARY_INTERVAL_MS = 30_000; // 정지 시 30초

/**
 * GPS 추적 커스텀 훅
 * - Geolocation API (고정밀 모드)
 * - 50m 이상 오차 좌표 자동 폐기
 * - 10초마다 서버에 배치 업로드
 */
export function useGpsTracker() {
  const [status, setStatus] = useState<TrackingStatus>("idle");
  const [currentPoint, setCurrentPoint] = useState<GpsPoint | null>(null);
  const [totalDistanceKm, setTotalDistanceKm] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);

  const pointsBuffer = useRef<GpsPoint[]>([]);
  const lastPoint = useRef<GpsPoint | null>(null);
  const watchId = useRef<number | null>(null);
  const batchTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const collectTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isStationary = useRef(false);

  // Kalman 필터 상태 (간소화 버전)
  const kalmanState = useRef({ pLat: 1, pLng: 1, xLat: 0, xLng: 0 });

  function applyKalman(lat: number, lng: number, accuracy: number): { lat: number; lng: number } {
    const Q = 0.00001;
    const R = Math.pow(accuracy / 111000, 2);
    const k = kalmanState.current;

    if (k.xLat === 0 && k.xLng === 0) {
      k.xLat = lat;
      k.xLng = lng;
      return { lat, lng };
    }

    k.pLat += Q;
    k.pLng += Q;
    const kgLat = k.pLat / (k.pLat + R);
    const kgLng = k.pLng / (k.pLng + R);
    k.xLat += kgLat * (lat - k.xLat);
    k.xLng += kgLng * (lng - k.xLng);
    k.pLat = (1 - kgLat) * k.pLat;
    k.pLng = (1 - kgLng) * k.pLng;

    return { lat: k.xLat, lng: k.xLng };
  }

  function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function isPhysicallyPossible(prev: GpsPoint, curr: { lat: number; lng: number; timestamp: string }): boolean {
    const dt = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
    if (dt <= 0) return false;
    const dist = haversineKm(prev.lat, prev.lng, curr.lat, curr.lng) * 1000; // m
    return dist / dt < 60; // 60 m/s = 216 km/h
  }

  const onPosition = useCallback((pos: GeolocationPosition) => {
    const { latitude, longitude, accuracy, speed, heading } = pos.coords;

    // 정확도 필터
    if (accuracy > MAX_ACCURACY_M) return;

    const smoothed = applyKalman(latitude, longitude, accuracy);
    const point: GpsPoint = {
      lat: smoothed.lat,
      lng: smoothed.lng,
      accuracy,
      speed: speed ? speed * 3.6 : null, // m/s → km/h
      heading,
      timestamp: new Date(pos.timestamp).toISOString(),
    };

    // 이상 점프 필터
    if (lastPoint.current && !isPhysicallyPossible(lastPoint.current, point)) return;

    // 정지 감지 (속도 0 또는 이동 < 10m)
    if (lastPoint.current) {
      const dist = haversineKm(lastPoint.current.lat, lastPoint.current.lng, point.lat, point.lng);
      isStationary.current = dist < 0.01 && (point.speed ?? 0) < 2;
      setTotalDistanceKm((prev) => prev + dist);
    }

    lastPoint.current = point;
    pointsBuffer.current.push(point);
    setCurrentPoint(point);
  }, []);

  const onError = useCallback((err: GeolocationPositionError) => {
    setError(`GPS 오류: ${err.message}`);
    setStatus("error");
  }, []);

  // 배치 업로드
  const flushBuffer = useCallback(async () => {
    if (!tripId || pointsBuffer.current.length === 0) return;
    const toUpload = [...pointsBuffer.current];
    pointsBuffer.current = [];

    try {
      await fetch("/api/gps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, points: toUpload }),
      });
    } catch {
      // 실패 시 버퍼에 복원
      pointsBuffer.current = [...toUpload, ...pointsBuffer.current];
    }
  }, [tripId]);

  // 수집 시작
  const startTracking = useCallback((id: string) => {
    if (!navigator.geolocation) {
      setError("이 브라우저는 GPS를 지원하지 않습니다.");
      setStatus("error");
      return;
    }

    setTripId(id);
    setStatus("waiting");
    setTotalDistanceKm(0);
    pointsBuffer.current = [];
    lastPoint.current = null;
    kalmanState.current = { pLat: 1, pLng: 1, xLat: 0, xLng: 0 };

    // 연속 위치 감시
    watchId.current = navigator.geolocation.watchPosition(onPosition, onError, GPS_OPTIONS);

    // 배치 업로드 타이머
    batchTimer.current = setInterval(flushBuffer, BATCH_INTERVAL_MS);

    setStatus("tracking");
  }, [onPosition, onError, flushBuffer]);

  // 수집 중단
  const stopTracking = useCallback(async () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (batchTimer.current) {
      clearInterval(batchTimer.current);
      batchTimer.current = null;
    }
    if (collectTimer.current) {
      clearInterval(collectTimer.current);
      collectTimer.current = null;
    }

    // 잔여 포인트 업로드
    await flushBuffer();
    setStatus("stopped");
  }, [flushBuffer]);

  // 정리
  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      if (batchTimer.current) clearInterval(batchTimer.current);
      if (collectTimer.current) clearInterval(collectTimer.current);
    };
  }, []);

  return {
    status,
    currentPoint,
    totalDistanceKm,
    error,
    tripId,
    startTracking,
    stopTracking,
  };
}
