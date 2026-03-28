"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { calculateToll, formatFee, type TollCalculationResult } from "@/lib/tollCalculator";

const TripMap = dynamic(() => import("@/components/TripMap"), { ssr: false });

interface GpsPoint {
  lat: number; lng: number; accuracy: number;
  speed: number | null; timestamp: string;
}

interface TripDetail {
  id: string;
  startAddress: string;
  endAddress: string | null;
  startTime: string;
  endTime: string | null;
  distanceKm: number;
  startOdometer: number | null;
  endOdometer: number | null;
  purpose: string | null;
  purposeCode: string | null;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
  gpsPoints: GpsPoint[];
  vehicle: { licensePlate: string; make: string; model: string; type?: string };
  driver: { name: string };
}

interface TripRouteButtonProps {
  tripId: string;
  startAddress: string;
  endAddress?: string | null;
  startLat?: number | null;
  startLng?: number | null;
  endLat?: number | null;
  endLng?: number | null;
}

function formatDuration(start: string, end: string | null) {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const h  = Math.floor(ms / 3_600_000);
  const m  = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

export function TripRouteButton({
  tripId, startAddress, endAddress,
  startLat, startLng, endLat, endLng,
}: TripRouteButtonProps) {
  const [open, setOpen]           = useState(false);
  const [trip, setTrip]           = useState<TripDetail | null>(null);
  const [loadingMap, setLoading]  = useState(false);
  const [toll, setToll]           = useState<TollCalculationResult | null>(null);

  async function openMap() {
    setOpen(true);
    if (trip) return;
    setLoading(true);
    const res  = await fetch(`/api/trips/${tripId}`);
    const data: TripDetail = await res.json();
    setTrip(data);
    if (data.gpsPoints?.length > 0) {
      setToll(calculateToll(data.gpsPoints, data.vehicle.type));
    }
    setLoading(false);
  }

  const duration = trip ? formatDuration(trip.startTime, trip.endTime) : "—";

  return (
    <>
      <button
        onClick={openMap}
        className="px-3 py-1.5 bg-[#CAFF33] text-[#0a0a0a] text-xs font-bold rounded-full hover:brightness-95 whitespace-nowrap flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-xs">route</span>
        경로보기
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── 헤더 ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#0a0a0a] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#CAFF33] text-base">route</span>
                </div>
                <div>
                  <p className="font-black text-[#0a0a0a]">
                    {trip?.vehicle.make} {trip?.vehicle.model}
                    <span className="ml-2 text-xs font-bold text-gray-400">{trip?.vehicle.licensePlate}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{trip?.driver.name}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-black">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* ── 지도 ── */}
              <div className="flex-1 relative min-w-0" style={{ minHeight: 360 }}>
                {loadingMap ? (
                  <div className="absolute inset-0 flex items-center justify-center gap-3 bg-gray-50">
                    <span className="material-symbols-outlined animate-spin text-[#CAFF33] text-3xl">progress_activity</span>
                    <span className="text-sm font-bold text-gray-500">경로 불러오는 중...</span>
                  </div>
                ) : trip ? (
                  <TripMap
                    gpsPoints={trip.gpsPoints}
                    startLat={trip.startLat}
                    startLng={trip.startLng}
                    endLat={trip.endLat}
                    endLng={trip.endLng}
                    startAddress={trip.startAddress}
                    endAddress={trip.endAddress}
                    height="100%"
                  />
                ) : null}
              </div>

              {/* ── 상세 정보 패널 ── */}
              <div className="w-72 shrink-0 border-l border-gray-200 overflow-y-auto p-5 space-y-5 bg-gray-50/50">

                {/* 경로 */}
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">이동 경로</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#0a0a0a] mt-1 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-[#0a0a0a]">{trip?.startAddress ?? startAddress}</p>
                        {trip?.startTime && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(trip.startTime).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="ml-1 w-px h-5 bg-gray-200 self-start ml-1" />
                    <div className="flex items-start gap-2">
                      <div className="w-2.5 h-2.5 rounded-full border-2 border-[#0a0a0a] mt-1 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-[#0a0a0a]">{trip?.endAddress ?? endAddress ?? "—"}</p>
                        {trip?.endTime && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(trip.endTime).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 주행 수치 */}
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">주행 정보</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: "straighten",  label: "이동 거리",  value: `${(trip?.distanceKm ?? 0).toFixed(1)} km` },
                      { icon: "timer",       label: "주행 시간",  value: duration },
                      { icon: "speed_400",   label: "출발 km",    value: trip?.startOdometer != null ? `${trip.startOdometer.toLocaleString()} km` : "—" },
                      { icon: "speed_400",   label: "도착 km",    value: trip?.endOdometer != null   ? `${trip.endOdometer.toLocaleString()} km`   : "—" },
                      { icon: "gps_fixed",   label: "GPS 포인트", value: `${trip?.gpsPoints?.length ?? 0}개` },
                      { icon: "flag",        label: "운행 목적",  value: trip?.purpose ?? (trip?.purposeCode?.replace(/_/g, " ") ?? "—") },
                    ].map((item) => (
                      <div key={item.label} className="bg-white border border-gray-200 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.label}</p>
                        <p className="text-sm font-black text-[#0a0a0a] mt-0.5 truncate">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 톨게이트 */}
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">하이패스 / 톨게이트</p>
                  {!toll || !toll.hasHighwayUsage ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                      <span className="material-symbols-outlined text-gray-200 text-2xl block mb-1">toll</span>
                      <p className="text-xs text-gray-400">고속도로 미이용</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-[#CAFF33]/10 border border-[#CAFF33]/30 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">예상 통행료</p>
                          <p className="text-lg font-black text-[#0a0a0a]">{formatFee(toll.totalFee)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">차종</p>
                          <p className="text-xs font-black">{toll.vehicleClassName}</p>
                        </div>
                      </div>
                      {toll.detectedGates.map((gate, i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-xl px-3 py-2 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-[#0a0a0a]">{gate.gate.name}</p>
                            <p className="text-[10px] text-gray-400">{gate.gate.expressway}</p>
                          </div>
                          <p className="text-xs font-black text-[#0a0a0a]">{formatFee(gate.fee)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
