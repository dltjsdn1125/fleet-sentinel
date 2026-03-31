"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { calculateToll, formatFee, type TollCalculationResult } from "@/lib/tollCalculator";

// 지도는 CSR 전용 (SSR 비활성화)
const TripMap = dynamic(() => import("@/components/TripMap"), { ssr: false });

interface GpsPoint {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  timestamp: string;
}

interface Trip {
  id: string;
  date: string;
  startTime: string;
  endTime: string | null;
  startAddress: string;
  endAddress: string | null;
  startLat?: number | null;
  startLng?: number | null;
  endLat?: number | null;
  endLng?: number | null;
  distanceKm: number;
  purpose: string | null;
  purposeCode: string | null;
  status: string;
  isManualEntry: boolean;
  isLocked: boolean;
  flagReason?: string | null;
  driver: { name: string };
  vehicle: { licensePlate: string; make: string; model: string; type?: string };
  gpsPoints?: GpsPoint[];
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:   { label: "진행중", className: "bg-[#CAFF33]/20 text-[#4a6400] border border-[#CAFF33]/40" },
  COMPLETED: { label: "완료",   className: "bg-[#CAFF33]/30 text-[#3a5000] border border-[#CAFF33]/50" },
  FLAGGED:   { label: "주의",   className: "bg-[#CAFF33]/20 text-[#4a6400] border border-[#CAFF33]/40" },
  APPROVED:  { label: "승인",   className: "bg-[#CAFF33] text-[#0a0a0a] border border-[#CAFF33]" },
};

const PURPOSE_CODE_LABEL: Record<string, string> = {
  CLIENT_VISIT: "고객사 방문",
  DELIVERY:     "납품·배송",
  MEETING:      "회의",
  COMMUTE:      "출퇴근",
  PRIVATE:      "사적 운행",
  MAINTENANCE:  "차량 정비",
  OTHER:        "기타",
};

export default function LogsPage() {
  const { data: session } = useSession();
  const [trips, setTrips]     = useState<Trip[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId]   = useState<string | null>(null);
  const [editPurpose, setEditPurpose] = useState("");

  // 선택된 운행 (지도 패널)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 필터
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate]     = useState(new Date().toISOString().split("T")[0]);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchTrips = useCallback(async (autoSelectFirst = false) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20", from: fromDate, to: toDate });
    if (statusFilter) params.set("status", statusFilter);
    const res  = await fetch(`/api/trips?${params}`);
    const data = await res.json();
    const loaded: Trip[] = data.trips ?? [];
    setTrips(loaded);
    setTotal(data.total ?? 0);
    setLoading(false);
    // 첫 로드 시 가장 최근 카드 자동 선택
    if (autoSelectFirst && loaded.length > 0) {
      openDetail(loaded[0]);
    }
  }, [page, fromDate, toDate, statusFilter]);

  useEffect(() => { fetchTrips(true); }, [fetchTrips]);

  // 운행 상세 (GPS 포인트 포함) 로드
  const openDetail = useCallback(async (trip: Trip) => {
    if (selectedTrip?.id === trip.id) { setSelectedTrip(null); return; }
    setSelectedTrip({ ...trip, gpsPoints: [] });
    setDetailLoading(true);
    const res  = await fetch(`/api/trips/${trip.id}`);
    const data = await res.json();
    setSelectedTrip(data);
    setDetailLoading(false);
  }, [selectedTrip]);

  // 톨게이트 요금 자동 계산 (GPS 포인트 로드 완료 후)
  const tollResult = useMemo<TollCalculationResult | null>(() => {
    if (!selectedTrip?.gpsPoints || selectedTrip.gpsPoints.length === 0) return null;
    return calculateToll(selectedTrip.gpsPoints, selectedTrip.vehicle.type);
  }, [selectedTrip?.id, selectedTrip?.gpsPoints?.length]);

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const missingPurpose = trips.filter((t) => t.status === "COMPLETED" && !t.purpose).length;
  const monthlyKm = trips
    .filter((t) => ["COMPLETED", "APPROVED"].includes(t.status))
    .reduce((s, t) => s + t.distanceKm, 0);

  async function savePurpose(id: string) {
    await fetch(`/api/trips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: editPurpose }),
    });
    setEditId(null);
    fetchTrips();
  }

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      {/* ── 좌측: 목록 패널 ── */}
      <div className="flex flex-col w-full md:w-1/2 xl:w-[55%] overflow-hidden border-b md:border-b-0 md:border-r border-gray-200 md:h-full" style={{maxHeight: "100%"}}>
        {/* ── 고정 헤더 + 필터 ── */}
        <div className="shrink-0 px-4 sm:px-8 pt-5 sm:pt-8 pb-5 bg-white border-b border-gray-100">
          {/* 헤더 */}
          <div className="flex justify-between items-end mb-5 sm:mb-8">
            <div>
              <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                <span>FleetSentinel</span>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <span className="text-[#0a0a0a]">운행일지</span>
              </nav>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight">운행일지</h1>
              <p className="text-gray-500 mt-1.5 text-xs sm:text-sm">GPS 자동 기록 · 클릭하면 지도에서 경로를 확인할 수 있습니다.</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1">이달 주행</span>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-3xl sm:text-4xl font-black">{monthlyKm.toFixed(1)}</span>
                <span className="text-base font-bold text-gray-400">km</span>
              </div>
            </div>
          </div>

          {/* 목적 미입력 알림 */}
          {missingPurpose > 0 && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-yellow-600">priority_high</span>
                <div>
                  <p className="font-bold text-yellow-800 text-sm">목적 미입력 {missingPurpose}건</p>
                  <p className="text-xs text-yellow-600 mt-0.5">국세청 제출 전 목적을 입력하세요.</p>
                </div>
              </div>
            </div>
          )}

          {/* 필터 */}
          <div className="bg-white border border-gray-200 p-5 rounded-xl flex flex-wrap items-end gap-3 mb-6">
            <div className="flex-1 min-w-[130px]">
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">시작일</label>
              <input type="date" value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-black" />
            </div>
            <div className="flex-1 min-w-[130px]">
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">종료일</label>
              <input type="date" value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-black" />
            </div>
            <div className="flex-1 min-w-[110px]">
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">상태</label>
              <select value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-black">
                <option value="">전체</option>
                <option value="COMPLETED">완료</option>
                <option value="PENDING">진행중</option>
                <option value="FLAGGED">주의</option>
              </select>
            </div>
            <Link href={`/api/reports/excel?from=${fromDate}&to=${toDate}`}
              className="px-5 py-2.5 bg-[#0a0a0a] text-white rounded-lg font-bold text-sm flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">download</span>
              엑셀
            </Link>
            <Link href="/logs/track"
              className="px-5 py-2.5 bg-[#CAFF33] text-[#0a0a0a] rounded-lg font-bold text-sm flex items-center gap-1.5 hover:brightness-95 transition-all">
              <span className="material-symbols-outlined text-base">add_circle</span>
              운행 시작
            </Link>
          </div>
        </div>
        {/* ── 스크롤 목록 ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5">
          <div className="space-y-2">
            {loading && (
              <div className="py-16 text-center text-gray-400 text-sm">불러오는 중...</div>
            )}
            {!loading && trips.length === 0 && (
              <div className="py-16 text-center">
                <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3">route</span>
                <p className="text-gray-400 text-sm">운행 기록이 없습니다.</p>
                <Link href="/logs/track" className="mt-3 inline-block text-sm font-bold underline">운행 시작하기</Link>
              </div>
            )}
            {trips.map((trip) => {
              const st = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG.PENDING;
              const isPending = trip.status === "COMPLETED" && !trip.purpose;
              const isSelected = selectedTrip?.id === trip.id;

              return (
                <div
                  key={trip.id}
                  onClick={() => openDetail(trip)}
                  className={`group bg-white border rounded-xl cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? "border-[#0a0a0a] shadow-md ring-1 ring-[#0a0a0a]/10"
                      : isPending
                      ? "border-yellow-200 hover:border-yellow-300"
                      : "border-gray-100 hover:border-gray-300 hover:shadow-sm"
                  }`}
                >
                  <div className="p-5 flex items-center gap-5">
                    {/* 날짜 */}
                    <div className="w-14 text-center shrink-0">
                      <div className="text-2xl font-black leading-none">
                        {new Date(trip.date).getDate()}
                      </div>
                      <div className="text-xs font-bold text-gray-400 uppercase mt-0.5">
                        {new Date(trip.date).toLocaleDateString("ko-KR", { month: "short" })}
                      </div>
                    </div>

                    {/* 경로 시각화 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        {/* 도트 라인 */}
                        <div className="flex flex-col items-center pt-1.5 shrink-0">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#0a0a0a]"></div>
                          <div className="w-px flex-1 my-1.5 bg-gray-200 min-h-[20px]"></div>
                          <div className="w-2.5 h-2.5 rounded-full border-2 border-[#0a0a0a]"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-2.5">
                            <span className="text-xs font-mono text-gray-400 mr-2">
                              {new Date(trip.startTime).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className="text-sm font-semibold text-[#0a0a0a] truncate">{trip.startAddress}</span>
                          </div>
                          <div>
                            <span className="text-xs font-mono text-gray-400 mr-2">
                              {trip.endTime
                                ? new Date(trip.endTime).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
                                : "—"}
                            </span>
                            <span className="text-sm font-semibold text-gray-500 truncate">{trip.endAddress ?? "도착지 없음"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 거리 */}
                    <div className="text-right shrink-0 w-20">
                      <div className="font-black text-base">{trip.distanceKm.toFixed(1)}</div>
                      <div className="text-xs text-gray-400">km</div>
                    </div>

                    {/* 상태 + 목적 */}
                    <div className="shrink-0 w-28 text-right space-y-1.5" onClick={(e) => e.stopPropagation()}>
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${st.className}`}>
                        {st.label}
                      </span>
                      {isPending ? (
                        <select
                          onChange={async (e) => {
                            if (!e.target.value) return;
                            await fetch(`/api/trips/${trip.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ purposeCode: e.target.value }),
                            });
                            fetchTrips();
                          }}
                          className="w-full bg-yellow-50 border border-yellow-200 text-yellow-800 font-bold rounded text-xs py-1 px-1.5 focus:outline-none"
                        >
                          <option value="">목적 선택</option>
                          {Object.entries(PURPOSE_CODE_LABEL).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-xs text-gray-500 truncate">
                          {trip.purpose ?? (trip.purposeCode ? PURPOSE_CODE_LABEL[trip.purposeCode] : "—")}
                        </div>
                      )}
                    </div>

                    {/* 차량 + 지도 아이콘 */}
                    <div className="shrink-0 flex flex-col items-end gap-2 w-24">
                      <span className="px-2 py-0.5 bg-gray-100 text-xs font-black rounded">
                        {trip.vehicle.licensePlate}
                      </span>
                      <span className={`material-symbols-outlined text-base transition-colors ${
                        isSelected ? "text-[#0a0a0a]" : "text-gray-300 group-hover:text-gray-500"
                      }`}>
                        {isSelected ? "map" : "chevron_right"}
                      </span>
                    </div>
                  </div>

                  {/* 이상 감지 배너 */}
                  {trip.status === "FLAGGED" && trip.flagReason && (
                    <div className="px-4 pb-3">
                      <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <span className="material-symbols-outlined text-red-500 text-sm">warning</span>
                        <span className="text-[10px] text-red-600 font-semibold">{trip.flagReason}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 페이지네이션 */}
          {total > 20 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-xs text-gray-400">
                총 <span className="font-bold text-[#0a0a0a]">{total}</span>건
              </div>
              <div className="flex items-center gap-1.5">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30">
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                {Array.from({ length: Math.min(Math.ceil(total / 20), 5) }, (_, i) => i + 1).map((n) => (
                  <button key={n} onClick={() => setPage(n)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold ${
                      n === page ? "bg-[#0a0a0a] text-white" : "border border-gray-200 hover:bg-gray-50"
                    }`}>
                    {n}
                  </button>
                ))}
                <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30">
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 우측: 지도 패널 ── */}
      <div className={`flex-col bg-gray-50 overflow-hidden min-w-0 ${selectedTrip ? "flex flex-1" : "hidden md:flex md:flex-1"}`}>
        {!selectedTrip ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-3xl text-gray-300">map</span>
            </div>
            <div>
              <p className="font-black text-gray-800 text-lg">운행을 선택하세요</p>
              <p className="text-sm text-gray-400 mt-1">좌측 목록에서 운행 기록을 클릭하면<br/>GPS 경로가 지도에 표시됩니다.</p>
            </div>
          </div>
        ) : (
          <>
          {/* 지도 패널 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#0a0a0a] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#CAFF33] text-base">route</span>
              </div>
              <div className="min-w-0">
                <p className="text-base font-black truncate text-[#0a0a0a]">
                  {selectedTrip.startAddress} →{" "}
                  <span className="text-[#0a0a0a]">{selectedTrip.endAddress ?? "진행중"}</span>
                </p>
                <p className="text-sm font-semibold text-[#0a0a0a] mt-0.5">
                  {new Date(selectedTrip.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
                  {" · "}
                  {selectedTrip.distanceKm.toFixed(1)}km
                  {" · "}
                  {selectedTrip.vehicle.licensePlate}
                </p>
              </div>
            </div>
            <button onClick={() => setSelectedTrip(null)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0 ml-2">
              <span className="material-symbols-outlined text-[#0a0a0a] text-xl">close</span>
            </button>
          </div>

          {/* 지도 */}
          <div className="flex-1 relative overflow-hidden">
            {detailLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 gap-3">
                <div className="w-8 h-8 border-2 border-[#0a0a0a] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-gray-400 font-medium">지도 로딩 중...</p>
              </div>
            ) : (
              <TripMap
                key={selectedTrip.id}
                gpsPoints={selectedTrip.gpsPoints ?? []}
                startLat={selectedTrip.startLat}
                startLng={selectedTrip.startLng}
                endLat={selectedTrip.endLat}
                endLng={selectedTrip.endLng}
                startAddress={selectedTrip.startAddress}
                endAddress={selectedTrip.endAddress ?? undefined}
                height="100%"
              />
            )}
          </div>

          {/* 하단 운행 정보 */}
          <div className="bg-white border-t border-gray-200 px-5 py-5 shrink-0">
            <div className="grid grid-cols-4 gap-4">
              {[
                {
                  label: "출발",
                  value: new Date(selectedTrip.startTime).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
                  icon: "trip_origin",
                },
                {
                  label: "도착",
                  value: selectedTrip.endTime
                    ? new Date(selectedTrip.endTime).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
                    : "진행중",
                  icon: "location_on",
                },
                {
                  label: "거리",
                  value: `${selectedTrip.distanceKm.toFixed(1)}km`,
                  icon: "straighten",
                },
                {
                  label: "GPS 포인트",
                  value: `${selectedTrip.gpsPoints?.length ?? 0}개`,
                  icon: "my_location",
                },
              ].map((info) => (
                <div key={info.label} className="text-center">
                  <span className="material-symbols-outlined text-gray-300 text-xl block mb-1.5">{info.icon}</span>
                  <div className="font-black text-base">{info.value}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">{info.label}</div>
                </div>
              ))}
            </div>
            {/* 목적 */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">운행 목적</span>
                <p className="text-base font-bold mt-1">
                  {selectedTrip.purpose
                    ?? (selectedTrip.purposeCode ? PURPOSE_CODE_LABEL[selectedTrip.purposeCode] : "미입력")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedTrip.isManualEntry && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-bold">수동입력</span>
                )}
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  STATUS_CONFIG[selectedTrip.status]?.className ?? ""
                }`}>
                  {STATUS_CONFIG[selectedTrip.status]?.label ?? selectedTrip.status}
                </span>
              </div>
            </div>
          </div>

          {/* ── 톨게이트 요금 자동 분석 ── */}
          {!detailLoading && (
            <div className="bg-white border-t border-gray-200 px-5 py-5 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-[#0a0a0a] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#CAFF33] text-sm">toll</span>
                  </div>
                  <span className="text-sm font-black uppercase tracking-widest text-gray-700">톨게이트 예상 비용</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">
                    {selectedTrip.vehicle.type ?? "SEDAN"} · {tollResult?.vehicleClassName ?? "1종 (소형)"}
                  </span>
                </div>
                <div className="text-right">
                  {tollResult?.hasHighwayUsage ? (
                    <span className="text-xl font-black text-[#0a0a0a]">
                      {formatFee(tollResult.totalFee)}
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-gray-400">고속도로 미이용</span>
                  )}
                </div>
              </div>

              {tollResult?.hasHighwayUsage ? (
                <>
                  {/* 통과 고속도로 */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {tollResult.expressways.map((ex) => (
                      <span key={ex} className="text-xs font-bold bg-[#CAFF33]/20 text-[#6b8500] border border-[#CAFF33]/40 px-2.5 py-0.5 rounded-full">
                        {ex}
                      </span>
                    ))}
                  </div>

                  {/* 요금소 목록 */}
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {tollResult.detectedGates.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-black flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <div>
                            <span className="font-bold text-gray-800">{d.gate.name}요금소</span>
                            <span className="text-gray-400 ml-1.5">{d.gate.expressway}</span>
                          </div>
                        </div>
                        <span className="font-black text-gray-700 shrink-0">{formatFee(d.fee)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">※ 실제 요금과 다를 수 있습니다 (2024 한국도로공사 기준)</span>
                    <span className="text-sm font-black">합계 {formatFee(tollResult.totalFee)}</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400">
                  {selectedTrip.gpsPoints && selectedTrip.gpsPoints.length > 0
                    ? "이 경로에서 고속도로 요금소가 감지되지 않았습니다."
                    : "GPS 데이터를 불러오는 중..."}
                </p>
              )}
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
