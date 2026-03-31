/**
 * GPS 추적 — 상태는 앱 레벨 TripTrackingProvider에서 유지됩니다.
 * 다른 페이지로 이동해도 운행 중이면 추적이 중단되지 않습니다.
 */
export {
  useGpsTracker,
  useTripTracking,
  useTripTrackingOptional,
  type GpsPoint,
  type TrackingStatus,
} from "@/contexts/TripTrackingContext";
