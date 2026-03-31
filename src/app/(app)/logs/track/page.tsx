"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useTripTracking } from "@/hooks/useGpsTracker";

const LiveTrackMap = dynamic(() => import("@/components/LiveTrackMap"), { ssr: false });

// ── 주소 자동완성 컴포넌트 ──────────────────────────────────────
interface NominatimResult {
  place_id: number;
  display_name: string;
  name: string;
  lat: string;
  lon: string;
}

function AddressInput({
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: string;
}) {
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기 — 드롭다운 자체 클릭은 제외
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function handleChange(val: string) {
    onChange(val);
    clearTimeout(timer.current);
    if (val.trim().length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        // 드롭다운 위치를 뷰포트 기준으로 계산 (overflow:hidden 부모 우회)
        if (inputRef.current) {
          const r = inputRef.current.getBoundingClientRect();
          setRect({ top: r.bottom + 4, left: r.left, width: r.width });
        }
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(val)}`);
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch { /* 무시 */ }
    }, 350);
  }

  function select(r: NominatimResult) {
    const addr = r.name || r.display_name.split(",")[0].trim();
    onChange(addr);
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapRef}>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none">
          {icon ?? "search"}
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder ?? "장소명 또는 주소 입력"}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CAFF33]"
        />
        {value && (
          <button type="button" onClick={() => { onChange(""); setResults([]); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        )}
      </div>

      {/* position:fixed 로 렌더링 → 부모 overflow:hidden 에 클리핑되지 않음 */}
      {open && results.length > 0 && rect && (
        <ul
          ref={listRef}
          style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto"
        >
          {results.map((r) => (
            <li key={r.place_id}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); select(r); }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                <p className="text-sm font-bold text-[#0a0a0a] truncate">
                  {r.name || r.display_name.split(",")[0].trim()}
                </p>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">{r.display_name}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
// ────────────────────────────────────────────────────────────────

const PURPOSE_OPTIONS = [
  { value: "CLIENT_VISIT", label: "고객사 방문", icon: "handshake" },
  { value: "DELIVERY", label: "납품·배송", icon: "local_shipping" },
  { value: "MEETING", label: "내부/외부 회의", icon: "groups" },
  { value: "COMMUTE", label: "출퇴근", icon: "home_work" },
  { value: "MAINTENANCE", label: "차량 정비", icon: "build" },
  { value: "PRIVATE", label: "사적 운행", icon: "person" },
  { value: "OTHER", label: "기타", icon: "more_horiz" },
];

export default function TrackPage() {
  const router = useRouter();
  const {
    currentPoint,
    totalDistanceKm,
    error,
    stage,
    setStage,
    livePoints,
    elapsed,
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
    openConfirm,
    confirmStartTrip,
    completeTrip,
  } = useTripTracking();

  const [vehicles, setVehicles] = useState<
    { id: string; licensePlate: string; make: string; model: string }[]
  >([]);
  const [manualStart, setManualStart] = useState("");
  const [destination, setDestination] = useState("");

  useEffect(() => {
    fetch("/api/vehicles?status=active")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setVehicles(list);
        if (list.length > 0) setSelectedVehicle(list[0].id);
      });
  }, [setSelectedVehicle]);

  // GPS 주소가 확인되면 출발지 입력란에 자동 채움 (이미 입력된 경우 덮어쓰지 않음)
  useEffect(() => {
    if (previewAddress && previewAddress !== "위치 확인 중..." && !manualStart) {
      setManualStart(previewAddress);
    }
  }, [previewAddress]);

  async function handleConfirmStart() {
    if (!selectedVehicle || !purposeCode) return;
    await confirmStartTrip({
      vehicleId: selectedVehicle,
      previewAddress: manualStart || previewAddress,
      previewCoords,
    });
  }

  async function handleStop() {
    await completeTrip({ purpose, purposeCode, passengers });
  }

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60),
      sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden relative flex-col">

      {/* ── 운행 시작 확인 모달 ── */}
      {stage === "confirming" && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-black text-[#0a0a0a]">운행 시작 확인</h2>
              <p className="text-xs text-gray-400 mt-0.5">현재 위치와 운행 목적을 확인해 주세요</p>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <AddressInput
                  label="출발지 *"
                  value={manualStart}
                  onChange={setManualStart}
                  placeholder="출발 장소명 입력 (예: 강남역)"
                  icon="trip_origin"
                />
                {previewAddress === "위치 확인 중..." && (
                  <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                    GPS 위치 확인 중...
                  </p>
                )}
              </div>
              <div>
                <AddressInput
                  label="도착지 (선택)"
                  value={destination}
                  onChange={setDestination}
                  placeholder="도착 장소명 입력 (예: 서울시청)"
                  icon="location_on"
                />
              </div>

              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">차량 *</p>
                <select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CAFF33]">
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.make} {v.model} — {v.licensePlate}</option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">운행 목적 *</p>
                <div className="grid grid-cols-2 gap-2">
                  {PURPOSE_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setPurposeCode(opt.value)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm transition-all ${
                        purposeCode === opt.value
                          ? "border-[#CAFF33] bg-[#CAFF33]/15 text-[#0a0a0a] font-bold"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}>
                      <span className="material-symbols-outlined text-base">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <input value={purpose} onChange={(e) => setPurpose(e.target.value)}
                  className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CAFF33]"
                  placeholder="상세 내용 (선택 — 예: 삼성전자 수원캠퍼스)" />
              </div>

              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">동승자 (선택)</p>
                <input value={passengers} onChange={(e) => setPassengers(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CAFF33]"
                  placeholder="홍길동, 김철수" />
              </div>
            </div>

            {error && (
              <div className="px-6 pb-2">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            <div className="px-6 pb-6 flex gap-3">
              <button type="button" onClick={() => setStage("idle")}
                className="flex-1 py-3.5 border border-gray-200 rounded-xl text-sm font-bold">취소</button>
              <button type="button" onClick={handleConfirmStart}
                disabled={!purposeCode || !selectedVehicle || loading || previewAddress === "위치 확인 중..."}
                className="flex-1 py-3.5 bg-[#CAFF33] text-[#0a0a0a] rounded-xl text-sm font-black flex items-center justify-center gap-2 hover:brightness-95 disabled:opacity-40">
                <span className="material-symbols-outlined text-lg">play_circle</span>
                운행 시작
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TRACKING: 지도 풀스크린 + 하단 바 ── */}
      {stage === "tracking" && (
        <div className="flex-1 relative min-h-0 overflow-hidden">
          <LiveTrackMap
            points={livePoints}
            currentPoint={currentPoint ? { lat: currentPoint.lat, lng: currentPoint.lng } : null}
            height="100%"
          />

          {/* GPS 상태 뱃지 + 도착지 */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-start justify-between gap-2 pointer-events-none">
            <div className="bg-[#0a0a0a]/85 text-white rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-lg">
              <div className="w-2 h-2 rounded-full bg-[#CAFF33] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">GPS 추적 중</span>
            </div>
            {destination && (
              <div className="bg-white/95 text-[#0a0a0a] rounded-lg px-3 py-1.5 flex items-center gap-1.5 shadow-lg border border-gray-200 max-w-[55%]">
                <span className="material-symbols-outlined text-sm text-gray-400 shrink-0">location_on</span>
                <span className="text-xs font-bold truncate">{destination}</span>
              </div>
            )}
          </div>

          {/* 하단 고정 바 */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200 px-3 py-3 flex items-center gap-2">
            <div className="flex-1 min-w-0 text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">경과</p>
              <p className="text-sm font-black font-mono tabular-nums">{fmt(elapsed)}</p>
            </div>
            <div className="w-px h-8 bg-gray-200 shrink-0" />
            <div className="flex-1 min-w-0 text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">거리</p>
              <p className="text-sm font-black">{totalDistanceKm.toFixed(2)} km</p>
            </div>
            <div className="w-px h-8 bg-gray-200 shrink-0" />
            <div className="flex-1 min-w-0 text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">속도</p>
              <p className="text-sm font-black">{(currentPoint?.speed ?? 0).toFixed(0)} km/h</p>
            </div>
            <div className="w-px h-8 bg-gray-200 shrink-0" />
            <button type="button" onClick={handleStop} disabled={loading}
              className="bg-white text-[#0a0a0a] border-2 border-[#0a0a0a] px-3 py-2 rounded-xl font-black text-xs flex items-center gap-1 hover:bg-gray-50 disabled:opacity-50 shrink-0 whitespace-nowrap">
              <span className="material-symbols-outlined text-sm">stop_circle</span>
              운행 종료
            </button>
          </div>
        </div>
      )}

      {/* ── IDLE: 운행 시작 패널 ── */}
      {stage === "idle" && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-sm px-8 py-10">
            <div className="mb-6">
              <h1 className="text-2xl font-black tracking-tight">운행 기록</h1>
              <p className="text-gray-400 text-xs mt-1">GPS가 이동 경로를 자동 기록합니다</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">대기 중</span>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <button type="button" onClick={openConfirm} disabled={vehicles.length === 0}
              className="w-full bg-[#CAFF33] text-[#0a0a0a] py-4 rounded-xl font-black text-base flex items-center justify-center gap-2 hover:brightness-95 disabled:opacity-40">
              <span className="material-symbols-outlined">play_circle</span>
              운행 시작
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">
              GPS 없는 구간은{" "}
              <button type="button" onClick={() => router.push("/logs/manual")} className="underline">수동 입력</button>
            </p>
          </div>
        </div>
      )}

      {/* ── STOPPED: 운행 기록 패널 + 지도 ── */}
      {stage === "stopped" && (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* 지도 (모바일 상단) */}
          <div className="relative min-h-[min(50vh,24rem)] md:min-h-0 flex-1 min-w-0 overflow-hidden">
            <LiveTrackMap
              points={livePoints}
              currentPoint={currentPoint ? { lat: currentPoint.lat, lng: currentPoint.lng } : null}
              height="100%"
            />
          </div>
          {/* 운행 기록 패널 (모바일 하단) */}
          <div className="w-full md:w-80 shrink-0 border-t md:border-t-0 md:border-l border-gray-200 overflow-y-auto bg-white">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h1 className="text-xl font-black tracking-tight">운행 기록</h1>
              <p className="text-gray-400 text-xs mt-0.5">GPS가 이동 경로를 자동 기록합니다</p>
            </div>
            <div className="px-6 py-5">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">운행 종료됨</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">총 거리</p>
                    <p className="text-lg font-black mt-0.5">{totalDistanceKm.toFixed(2)} km</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">경과 시간</p>
                    <p className="text-lg font-black font-mono mt-0.5">{fmt(elapsed)}</p>
                  </div>
                  {(manualStart || startAddress) && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">출발지</p>
                      <p className="text-sm mt-0.5 truncate">{manualStart || startAddress}</p>
                    </div>
                  )}
                  {destination && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">도착지</p>
                      <p className="text-sm mt-0.5 truncate">{destination}</p>
                    </div>
                  )}
                  {purposeCode && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">운행 목적</p>
                      <p className="text-sm font-bold mt-0.5">
                        {PURPOSE_OPTIONS.find((p) => p.value === purposeCode)?.label ?? purposeCode}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {error && <p className="text-red-400 text-xs mb-4">{error}</p>}
              <p className="text-center text-xs text-gray-400">
                GPS 없는 구간은{" "}
                <button type="button" onClick={() => router.push("/logs/manual")} className="underline">수동 입력</button>
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
