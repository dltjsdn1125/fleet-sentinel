"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useGpsTracker } from "@/hooks/useGpsTracker";

const LiveTrackMap = dynamic(() => import("@/components/LiveTrackMap"), { ssr: false });

const PURPOSE_OPTIONS = [
  { value: "CLIENT_VISIT", label: "고객사 방문",    icon: "handshake" },
  { value: "DELIVERY",     label: "납품·배송",      icon: "local_shipping" },
  { value: "MEETING",      label: "내부/외부 회의", icon: "groups" },
  { value: "COMMUTE",      label: "출퇴근",          icon: "home_work" },
  { value: "MAINTENANCE",  label: "차량 정비",       icon: "build" },
  { value: "PRIVATE",      label: "사적 운행",       icon: "person" },
  { value: "OTHER",        label: "기타",            icon: "more_horiz" },
];

interface Point { lat: number; lng: number }

// 단계: idle → confirming → tracking → stopped
type Stage = "idle" | "confirming" | "tracking" | "stopped";

export default function TrackPage() {
  const router = useRouter();
  const { status, currentPoint, totalDistanceKm, error, startTracking, stopTracking } =
    useGpsTracker();

  const [stage, setStage]               = useState<Stage>("idle");
  const [vehicles, setVehicles]         = useState<{ id: string; licensePlate: string; make: string; model: string }[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [purpose, setPurpose]           = useState("");
  const [purposeCode, setPurposeCode]   = useState("");
  const [passengers, setPassengers]     = useState("");

  const [startAddress, setStartAddress] = useState("");
  const [previewAddress, setPreviewAddress] = useState("위치 확인 중...");
  const [previewCoords, setPreviewCoords]   = useState<Point | null>(null);

  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [elapsed, setElapsed]           = useState(0);
  const [startAt, setStartAt]           = useState<Date | null>(null);
  const [loading, setLoading]           = useState(false);
  const [livePoints, setLivePoints]     = useState<Point[]>([]);
  const geocodedRef = useRef(false);

  // 차량 목록
  useEffect(() => {
    fetch("/api/vehicles?status=active")
      .then((r) => r.json())
      .then((data) => {
        setVehicles(Array.isArray(data) ? data : []);
        if (data.length > 0) setSelectedVehicle(data[0].id);
      });
  }, []);

  // 경과 시간
  useEffect(() => {
    if (stage !== "tracking" || !startAt) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startAt.getTime()) / 1000)), 1000);
    return () => clearInterval(t);
  }, [stage, startAt]);

  // GPS 포인트 누적 (tracking 중만)
  useEffect(() => {
    if (stage !== "tracking" || !currentPoint) return;
    setLivePoints((prev) => [...prev, { lat: currentPoint.lat, lng: currentPoint.lng }]);
    if (!geocodedRef.current && !startAddress) {
      geocodedRef.current = true;
      fetch("/api/gps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: currentPoint.lat, lng: currentPoint.lng }),
      }).then((r) => r.json()).then((d) => setStartAddress(d.address ?? ""));
    }
  }, [currentPoint, stage]);

  // ── STEP 1: "운행 시작" 클릭 → 현재 위치 조회 후 확인 모달 열기 ──
  async function openConfirm() {
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
  }

  // ── STEP 2: 확인 버튼 → 실제 운행 시작 ──
  async function handleConfirmStart() {
    if (!selectedVehicle || !purposeCode) return;
    setLoading(true);

    const now = new Date();
    const addr = previewAddress !== "위치 확인 중..." && previewAddress !== "GPS 신호를 가져올 수 없습니다"
      ? previewAddress : "";

    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicleId: selectedVehicle,
        startTime: now.toISOString(),
        startAddress: addr,
        startLat: previewCoords?.lat,
        startLng: previewCoords?.lng,
      }),
    });
    const trip = await res.json();
    setCurrentTripId(trip.id);
    setStartAddress(addr);
    setStartAt(now);
    geocodedRef.current = true;
    setLivePoints(previewCoords ? [previewCoords] : []);
    startTracking(trip.id);
    setStage("tracking");
    setLoading(false);
  }

  // ── 운행 종료 ──
  async function handleStop() {
    if (!currentTripId) return;
    setLoading(true);
    await stopTracking();

    let endAddress = "";
    if (currentPoint) {
      const r = await fetch("/api/gps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: currentPoint.lat, lng: currentPoint.lng }),
      });
      const d = await r.json();
      endAddress = d.address ?? "";
    }

    await fetch(`/api/trips/${currentTripId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endTime: new Date().toISOString(),
        endAddress,
        endLat: currentPoint?.lat,
        endLng: currentPoint?.lng,
        purpose, purposeCode, passengers,
        status: "COMPLETED",
      }),
    });

    setStage("stopped");
    setLoading(false);
    router.push("/logs");
  }

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  const showMap = stage === "tracking" || stage === "stopped";

  return (
    <div
      className={`flex min-h-0 flex-1 ${showMap ? "flex-row" : "flex-col items-center justify-center"} overflow-hidden relative`}
    >

      {/* ──────────────── 확인 모달 ──────────────── */}
      {stage === "confirming" && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">

            {/* 헤더 */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-black text-[#0a0a0a]">운행 시작 확인</h2>
              <p className="text-xs text-gray-400 mt-0.5">현재 위치와 운행 목적을 확인해 주세요</p>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* 현재 위치 */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">현재 위치 (출발지)</p>
                <div className={`flex items-start gap-3 p-4 rounded-xl border ${
                  previewAddress === "위치 확인 중..."
                    ? "bg-gray-50 border-gray-200"
                    : previewAddress.includes("없습니다")
                    ? "bg-red-50 border-red-200"
                    : "bg-[#CAFF33]/10 border-[#CAFF33]/40"
                }`}>
                  <span className={`material-symbols-outlined text-xl mt-0.5 ${
                    previewAddress === "위치 확인 중..." ? "animate-spin text-gray-300"
                    : previewAddress.includes("없습니다") ? "text-red-400"
                    : "text-[#0a0a0a]"
                  }`}>
                    {previewAddress === "위치 확인 중..." ? "progress_activity"
                    : previewAddress.includes("없습니다") ? "gps_off"
                    : "location_on"}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#0a0a0a] leading-snug">{previewAddress}</p>
                    {previewCoords && (
                      <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                        {previewCoords.lat.toFixed(5)}, {previewCoords.lng.toFixed(5)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 차량 선택 */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">차량 *</p>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CAFF33]"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.make} {v.model} — {v.licensePlate}</option>
                  ))}
                </select>
              </div>

              {/* 운행 목적 */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">운행 목적 *</p>
                <div className="grid grid-cols-2 gap-2">
                  {PURPOSE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPurposeCode(opt.value)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm transition-all ${
                        purposeCode === opt.value
                          ? "border-[#CAFF33] bg-[#CAFF33]/15 text-[#0a0a0a] font-bold"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {/* 상세 내용 */}
                <input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CAFF33]"
                  placeholder="상세 내용 (선택 — 예: 삼성전자 수원캠퍼스)"
                />
              </div>

              {/* 동승자 */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">동승자 (선택)</p>
                <input
                  value={passengers}
                  onChange={(e) => setPassengers(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CAFF33]"
                  placeholder="홍길동, 김철수"
                />
              </div>
            </div>

            {/* 버튼 */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setStage("idle")}
                className="flex-1 py-3.5 border border-gray-200 rounded-xl text-sm font-bold"
              >
                취소
              </button>
              <button
                onClick={handleConfirmStart}
                disabled={!purposeCode || !selectedVehicle || loading || previewAddress === "위치 확인 중..."}
                className="flex-1 py-3.5 bg-[#CAFF33] text-[#0a0a0a] rounded-xl text-sm font-black flex items-center justify-center gap-2 hover:brightness-95 disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-lg">play_circle</span>
                운행 시작
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 좌측: 컨트롤 패널 ── */}
      <div className={`flex flex-col ${showMap ? "w-72 shrink-0 border-r border-gray-200 overflow-y-auto" : "w-full max-w-sm px-8 py-10"} bg-white`}>

        <div className="px-6 pt-8 pb-4">
          <h1 className="text-2xl font-black tracking-tight">운행 기록</h1>
          <p className="text-gray-400 text-xs mt-1">GPS가 이동 경로를 자동 기록합니다</p>
        </div>

        {/* 상태 카드 */}
        <div className={`mx-6 rounded-xl p-5 mb-4 ${stage === "tracking" ? "bg-[#0a0a0a] text-white" : "bg-gray-50 border border-gray-200"}`}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className={`w-2.5 h-2.5 rounded-full ${stage === "tracking" ? "bg-[#CAFF33] animate-pulse" : "bg-gray-300"}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${stage === "tracking" ? "text-gray-400" : "text-gray-500"}`}>
              {stage === "idle"     ? "대기 중"
               : stage === "tracking" ? "GPS 추적 중"
               : stage === "stopped"  ? "운행 종료됨"
               : "확인 중"}
            </span>
          </div>

          {stage === "tracking" && (
            <>
              <div className="mb-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">경과 시간</p>
                <p className="text-3xl font-black font-mono">{fmt(elapsed)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">주행 거리</p>
                  <p className="text-lg font-black mt-0.5">{totalDistanceKm.toFixed(2)} km</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">현재 속도</p>
                  <p className="text-lg font-black mt-0.5">{(currentPoint?.speed ?? 0).toFixed(0)} km/h</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">출발지</p>
                <p className="text-xs mt-0.5 text-gray-200 truncate">{startAddress || "확인 중..."}</p>
              </div>
              {purposeCode && (
                <div className="mt-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">운행 목적</p>
                  <p className="text-xs mt-0.5 text-[#CAFF33] font-bold">
                    {PURPOSE_OPTIONS.find((p) => p.value === purposeCode)?.label ?? purposeCode}
                  </p>
                </div>
              )}
            </>
          )}
          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
        </div>

        {/* 버튼 */}
        <div className="px-6 pb-8 mt-auto">
          {stage === "idle" && (
            <button
              onClick={openConfirm}
              disabled={vehicles.length === 0}
              className="w-full bg-[#CAFF33] text-[#0a0a0a] py-4 rounded-xl font-black text-base flex items-center justify-center gap-2 hover:brightness-95 disabled:opacity-40"
            >
              <span className="material-symbols-outlined">play_circle</span>
              운행 시작
            </button>
          )}
          {stage === "tracking" && (
            <button
              onClick={handleStop}
              disabled={loading}
              className="w-full bg-white text-[#0a0a0a] border-2 border-[#0a0a0a] py-4 rounded-xl font-black text-base flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-50"
            >
              <span className="material-symbols-outlined">stop_circle</span>
              운행 종료 및 저장
            </button>
          )}
          <p className="text-center text-xs text-gray-400 mt-3">
            GPS 없는 구간은{" "}
            <button onClick={() => router.push("/logs/manual")} className="underline">수동 입력</button>
          </p>
        </div>
      </div>

      {/* ── 우측: 실시간 지도 ── */}
      {showMap && (
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <LiveTrackMap
            points={livePoints}
            currentPoint={currentPoint ? { lat: currentPoint.lat, lng: currentPoint.lng } : null}
            height="100%"
          />
          {stage === "tracking" && (
            <div className="absolute top-4 left-4 right-4 flex gap-3 pointer-events-none">
              <div className="bg-[#0a0a0a]/90 text-white rounded-xl px-5 py-3 flex items-center gap-3 shadow-lg">
                <span className="material-symbols-outlined text-[#CAFF33] text-lg">timer</span>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">경과 시간</p>
                  <p className="text-xl font-black font-mono">{fmt(elapsed)}</p>
                </div>
              </div>
              <div className="bg-[#0a0a0a]/90 text-white rounded-xl px-5 py-3 flex items-center gap-3 shadow-lg">
                <span className="material-symbols-outlined text-[#CAFF33] text-lg">straighten</span>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">이동 거리</p>
                  <p className="text-xl font-black">{totalDistanceKm.toFixed(2)} km</p>
                </div>
              </div>
              <div className="bg-[#0a0a0a]/90 text-white rounded-xl px-5 py-3 flex items-center gap-3 shadow-lg">
                <span className="material-symbols-outlined text-[#CAFF33] text-lg">speed</span>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">현재 속도</p>
                  <p className="text-xl font-black">{(currentPoint?.speed ?? 0).toFixed(0)} km/h</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
