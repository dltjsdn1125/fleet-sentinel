"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export interface GpsPoint {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: string;
}

export type TrackingStatus = "idle" | "waiting" | "tracking" | "stopped" | "error";

export type TripStage = "idle" | "confirming" | "tracking" | "stopped";

const GPS_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 8000,
};

const MAX_ACCURACY_M = 50;
const BATCH_INTERVAL_MS = 10_000;

interface Point {
  lat: number;
  lng: number;
}

/** 저빈도: 네비·다른 페이지 — GPS 틱마다 갱신되지 않음 */
type TripUiContextValue = {
  status: TrackingStatus;
  error: string | null;
  tripId: string | null;
  stage: TripStage;
  setStage: (s: TripStage) => void;
  currentTripId: string | null;
  startAddress: string;
  purpose: string;
  setPurpose: (v: string) => void;
  purposeCode: string;
  setPurposeCode: (v: string) => void;
  passengers: string;
  setPassengers: (v: string) => void;
  previewAddress: string;
  previewCoords: Point | null;
  selectedVehicle: string;
  setSelectedVehicle: (v: string) => void;
  loading: boolean;
  startTracking: (id: string) => void;
  stopGps: () => Promise<void>;
  openConfirm: () => void;
  confirmStartTrip: (args: {
    vehicleId: string;
    previewAddress: string;
    previewCoords: Point | null;
  }) => Promise<void>;
  completeTrip: (args: { purpose: string; purposeCode: string; passengers: string }) => Promise<void>;
  resetAfterNavigateAway: () => void;
};

/** 고빈도: 추적 화면·지도만 구독 */
type TripGpsContextValue = {
  currentPoint: GpsPoint | null;
  totalDistanceKm: number;
  livePoints: Point[];
  elapsed: number;
};

export type TripTrackingContextValue = TripUiContextValue & TripGpsContextValue;

const TripUiContext = createContext<TripUiContextValue | null>(null);
const TripGpsContext = createContext<TripGpsContextValue | null>(null);

/** @deprecated 내부용 — useTripTracking / useTripTrackingOptional 사용 */
export const TripTrackingContext = TripUiContext;

export function useTripTrackingOptional() {
  return useContext(TripUiContext);
}

export function TripTrackingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [status, setStatus] = useState<TrackingStatus>("idle");
  const [currentPoint, setCurrentPoint] = useState<GpsPoint | null>(null);
  const [totalDistanceKm, setTotalDistanceKm] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);

  const [stage, setStage] = useState<TripStage>("idle");
  const [livePoints, setLivePoints] = useState<Point[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [startAddress, setStartAddress] = useState("");
  const [purpose, setPurpose] = useState("");
  const [purposeCode, setPurposeCode] = useState("");
  const [passengers, setPassengers] = useState("");
  const [previewAddress, setPreviewAddress] = useState("위치 확인 중...");
  const [previewCoords, setPreviewCoords] = useState<Point | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [loading, setLoading] = useState(false);

  const pointsBuffer = useRef<GpsPoint[]>([]);
  const lastPoint = useRef<GpsPoint | null>(null);
  const watchId = useRef<number | null>(null);
  const batchTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tripIdRef = useRef<string | null>(null);
  const geocodedRef = useRef(false);
  const kalmanState = useRef({ pLat: 1, pLng: 1, xLat: 0, xLng: 0 });
  const currentPointRef = useRef<GpsPoint | null>(null);

  useEffect(() => {
    tripIdRef.current = tripId;
  }, [tripId]);

  useEffect(() => {
    currentPointRef.current = currentPoint;
  }, [currentPoint]);

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
    const dist = haversineKm(prev.lat, prev.lng, curr.lat, curr.lng) * 1000;
    return dist / dt < 60;
  }

  const flushBuffer = useCallback(async () => {
    const id = tripIdRef.current;
    if (!id || pointsBuffer.current.length === 0) return;
    const toUpload = [...pointsBuffer.current];
    pointsBuffer.current = [];
    try {
      await fetch("/api/gps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: id, points: toUpload }),
      });
    } catch {
      pointsBuffer.current = [...toUpload, ...pointsBuffer.current];
    }
  }, []);

  const onPosition = useCallback((pos: GeolocationPosition) => {
    const { latitude, longitude, accuracy, speed, heading } = pos.coords;
    if (accuracy > MAX_ACCURACY_M) return;
    const smoothed = applyKalman(latitude, longitude, accuracy);
    const point: GpsPoint = {
      lat: smoothed.lat,
      lng: smoothed.lng,
      accuracy,
      speed: speed ? speed * 3.6 : null,
      heading,
      timestamp: new Date(pos.timestamp).toISOString(),
    };
    if (lastPoint.current && !isPhysicallyPossible(lastPoint.current, point)) return;
    if (lastPoint.current) {
      const dist = haversineKm(lastPoint.current.lat, lastPoint.current.lng, point.lat, point.lng);
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

  const currentTripIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentTripIdRef.current = currentTripId;
  }, [currentTripId]);

  const startTracking = useCallback(
    (id: string) => {
      if (!navigator.geolocation) {
        setError("이 브라우저는 GPS를 지원하지 않습니다.");
        setStatus("error");
        return;
      }
      if (tripIdRef.current === id && watchId.current !== null) {
        setStatus("tracking");
        return;
      }
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      if (batchTimer.current) {
        clearInterval(batchTimer.current);
        batchTimer.current = null;
      }

      setTripId(id);
      tripIdRef.current = id;
      setStatus("waiting");
      setTotalDistanceKm(0);
      pointsBuffer.current = [];
      lastPoint.current = null;
      kalmanState.current = { pLat: 1, pLng: 1, xLat: 0, xLng: 0 };

      watchId.current = navigator.geolocation.watchPosition(onPosition, onError, GPS_OPTIONS);
      batchTimer.current = setInterval(flushBuffer, BATCH_INTERVAL_MS);
      setStatus("tracking");
    },
    [onPosition, onError, flushBuffer]
  );

  const stopGps = useCallback(async () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (batchTimer.current) {
      clearInterval(batchTimer.current);
      batchTimer.current = null;
    }
    await flushBuffer();
    setStatus("stopped");
  }, [flushBuffer]);

  const openConfirm = useCallback(() => {
    setError(null);
    setStage("confirming");
    setPreviewAddress("위치 확인 중...");
    setPreviewCoords(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setPreviewCoords({ lat, lng });
        const r = await fetch("/api/gps", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
        });
        const d = await r.json();
        setPreviewAddress(d.address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      },
      () => setPreviewAddress("GPS 신호를 가져올 수 없습니다"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const confirmStartTrip = useCallback(
    async (args: { vehicleId: string; previewAddress: string; previewCoords: Point | null }) => {
      const { vehicleId, previewAddress: pa, previewCoords: pc } = args;
      setError(null);
      setLoading(true);
      const now = new Date();
      const addr =
        pa !== "위치 확인 중..." && pa !== "GPS 신호를 가져올 수 없습니다" ? pa : "";
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          startTime: now.toISOString(),
          startAddress: addr,
          startLat: pc?.lat,
          startLng: pc?.lng,
        }),
      });
      const trip = await res.json();
      if (!res.ok) {
        setLoading(false);
        setError(trip.error ?? "운행 생성 실패");
        return;
      }
      setCurrentTripId(trip.id);
      setStartAddress(addr);
      setStartAt(now);
      geocodedRef.current = true;
      setLivePoints(pc ? [pc] : []);
      startTracking(trip.id);
      setStage("tracking");
      setLoading(false);
    },
    [startTracking]
  );

  const resetAfterNavigateAway = useCallback(() => {
    setStage("idle");
    setTripId(null);
    tripIdRef.current = null;
    pointsBuffer.current = [];
    lastPoint.current = null;
    kalmanState.current = { pLat: 1, pLng: 1, xLat: 0, xLng: 0 };
    setCurrentTripId(null);
    setStartAt(null);
    setLivePoints([]);
    setStartAddress("");
    setPurpose("");
    setPurposeCode("");
    setPassengers("");
    setElapsed(0);
    setCurrentPoint(null);
    currentPointRef.current = null;
    setTotalDistanceKm(0);
    setError(null);
    setStatus("idle");
    geocodedRef.current = false;
  }, []);

  const completeTrip = useCallback(
    async (args: { purpose: string; purposeCode: string; passengers: string }) => {
      const tid = currentTripIdRef.current;
      if (!tid) return;
      setLoading(true);
      await stopGps();

      const pt = currentPointRef.current;
      let endAddress = "";
      if (pt) {
        const r = await fetch("/api/gps", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: pt.lat, lng: pt.lng }),
        });
        const d = await r.json();
        endAddress = d.address ?? "";
      }

      await fetch(`/api/trips/${tid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endTime: new Date().toISOString(),
          endAddress,
          endLat: pt?.lat,
          endLng: pt?.lng,
          purpose: args.purpose,
          purposeCode: args.purposeCode,
          passengers: args.passengers,
          status: "COMPLETED",
        }),
      });

      setStage("stopped");
      setLoading(false);
      router.push("/logs");
      resetAfterNavigateAway();
    },
    [stopGps, router, resetAfterNavigateAway]
  );

  useEffect(() => {
    if (stage !== "tracking" || !startAt) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startAt.getTime()) / 1000)), 1000);
    return () => clearInterval(t);
  }, [stage, startAt]);

  useEffect(() => {
    if (stage !== "tracking" || !currentPoint) return;
    setLivePoints((prev) => [...prev, { lat: currentPoint.lat, lng: currentPoint.lng }]);
  }, [currentPoint?.timestamp, stage]);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      if (batchTimer.current) clearInterval(batchTimer.current);
    };
  }, []);

  const uiValue = useMemo<TripUiContextValue>(
    () => ({
      status,
      error,
      tripId,
      stage,
      setStage,
      currentTripId,
      startAddress,
      purpose,
      setPurpose,
      purposeCode,
      setPurposeCode,
      passengers,
      setPassengers,
      previewAddress,
      previewCoords,
      selectedVehicle,
      setSelectedVehicle,
      loading,
      startTracking,
      stopGps,
      openConfirm,
      confirmStartTrip,
      completeTrip,
      resetAfterNavigateAway,
    }),
    [
      status,
      error,
      tripId,
      stage,
      currentTripId,
      startAddress,
      purpose,
      purposeCode,
      passengers,
      previewAddress,
      previewCoords,
      selectedVehicle,
      loading,
      startTracking,
      stopGps,
      openConfirm,
      confirmStartTrip,
      completeTrip,
      resetAfterNavigateAway,
    ]
  );

  const gpsValue = useMemo<TripGpsContextValue>(
    () => ({
      currentPoint,
      totalDistanceKm,
      livePoints,
      elapsed,
    }),
    [currentPoint, totalDistanceKm, livePoints, elapsed]
  );

  return (
    <TripUiContext.Provider value={uiValue}>
      <TripGpsContext.Provider value={gpsValue}>{children}</TripGpsContext.Provider>
    </TripUiContext.Provider>
  );
}

export function useTripTracking() {
  const ui = useContext(TripUiContext);
  const gps = useContext(TripGpsContext);
  if (!ui || !gps) throw new Error("useTripTracking must be used within TripTrackingProvider");
  return { ...ui, ...gps };
}

/** @deprecated use useTripTracking */
export function useGpsTracker() {
  const t = useTripTracking();
  return {
    status: t.status,
    currentPoint: t.currentPoint,
    totalDistanceKm: t.totalDistanceKm,
    error: t.error,
    tripId: t.tripId,
    startTracking: t.startTracking,
    stopTracking: t.stopGps,
  };
}
