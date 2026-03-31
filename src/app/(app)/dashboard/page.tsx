import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { TripRouteButton } from "@/components/TripRouteModal";

async function getDashboardData(companyId: string, userId: string, isAdmin: boolean) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalVehicles, activeToday, missingPurpose, monthlyKm, recentTrips] = await Promise.all([
    isAdmin
      ? prisma.vehicle.count({ where: { companyId, isActive: true } })
      : prisma.vehicle.count({ where: { companyId, isActive: true } }),

    prisma.trip.count({
      where: {
        ...(isAdmin ? { vehicle: { companyId } } : { driverId: userId }),
        date: { gte: new Date(now.toDateString()) },
      },
    }),

    prisma.trip.count({
      where: {
        ...(isAdmin ? { driver: { companyId } } : { driverId: userId }),
        status: "COMPLETED",
        purpose: null,
      },
    }),

    prisma.trip.aggregate({
      where: {
        ...(isAdmin ? { driver: { companyId } } : { driverId: userId }),
        date: { gte: monthStart },
        status: { in: ["COMPLETED", "APPROVED"] },
      },
      _sum: { distanceKm: true },
    }),

    prisma.trip.findMany({
      where: isAdmin ? { driver: { companyId } } : { driverId: userId },
      include: {
        driver: { select: { name: true } },
        vehicle: { select: { licensePlate: true, make: true, model: true } },
        // purpose, purposeCode, distanceKm은 Trip 기본 필드라 include 불필요
      },
      orderBy: { date: "desc" },
      take: 8,
    }),
  ]);

  return {
    totalVehicles,
    activeToday,
    missingPurpose,
    monthlyKm: monthlyKm._sum.distanceKm ?? 0,
    recentTrips,
  };
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDING:   { label: "진행중", className: "bg-[#CAFF33]/20 text-[#4a6400] border border-[#CAFF33]/40" },
  COMPLETED: { label: "완료",   className: "bg-[#CAFF33]/30 text-[#3a5000] border border-[#CAFF33]/50" },
  FLAGGED:   { label: "주의",   className: "bg-[#CAFF33]/20 text-[#4a6400] border border-[#CAFF33]/40" },
  APPROVED:  { label: "승인",   className: "bg-[#CAFF33] text-[#0a0a0a] border border-[#CAFF33]" },
};

function ymd(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  const data = await getDashboardData(session.user.companyId ?? "", session.user.id, isAdmin);

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const excelExportHref = `/api/reports/excel?from=${encodeURIComponent(ymd(monthStart))}&to=${encodeURIComponent(ymd(today))}`;

  // 틱커에 반복 표시할 아이템
  const tickerItems = [
    { icon: "directions_car", label: "총 차량",      value: `${data.totalVehicles}대` },
    { icon: "route",          label: "오늘 운행",    value: `${data.activeToday}건` },
    { icon: "warning",        label: "목적 미입력",  value: `${data.missingPurpose}건` },
    { icon: "straighten",     label: "이달 주행",    value: `${data.monthlyKm.toLocaleString()}km` },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── 상단 스탯 틱커 바 ── */}
      <style>{`
        @keyframes dashTicker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .dash-ticker {
          display: flex;
          width: max-content;
          animation: dashTicker 150s linear infinite;
        }
        .dash-ticker:hover { animation-play-state: paused; }
      `}</style>
      <div className="shrink-0 w-full overflow-hidden bg-white border-b border-gray-200 h-8 flex items-center">
        <div className="dash-ticker items-center whitespace-nowrap">
          {/* 아이템을 6번 반복한 배열 2세트 → 한 세트가 항상 화면보다 넓어 중복 노출 없음 */}
          {[...Array(2)].map((_, setIdx) => (
            <span key={setIdx} className="flex items-center">
              {[...Array(6)].flatMap(() => tickerItems).map((item, i) => (
                <span key={i} className="flex items-center gap-2 px-10">
                  <span className="material-symbols-outlined text-[#CAFF33]"
                    style={{ fontSize: "12px" }}>{item.icon}</span>
                  <span className="text-xs font-bold text-[#0a0a0a]">{item.label}</span>
                  <span className="text-xs font-bold text-[#0a0a0a]">{item.value}</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ── 메인 콘텐츠 ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-12 py-6 md:py-10">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 md:mb-8">
        <div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-black">Fleet Intelligence</h2>
          <p className="text-gray-500 mt-2 font-medium text-sm">
            실시간 운행 현황 및 법인 차량 운행일지 관리
          </p>
        </div>
        <div className="flex gap-2 sm:gap-4">
          <Link
            href={excelExportHref}
            className="flex-1 sm:flex-none px-3 sm:px-6 py-2.5 sm:py-3 bg-white text-black border border-gray-200 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors text-sm"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            <span className="hidden sm:inline">엑셀 내보내기</span>
            <span className="sm:hidden">내보내기</span>
          </Link>
          {isAdmin && (
            <Link
              href="/fleet"
              className="flex-1 sm:flex-none px-3 sm:px-6 py-2.5 sm:py-3 bg-[#CAFF33] text-[#0a0a0a] rounded-lg font-bold flex items-center justify-center gap-2 hover:brightness-95 transition-colors text-sm"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              차량 등록
            </Link>
          )}
        </div>
      </div>

      {/* 최근 운행 기록 */}
      <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-10 py-4 sm:py-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg sm:text-2xl font-black text-black">최근 운행 기록</h3>
          <Link
            href="/logs"
            className="text-sm font-black text-black uppercase tracking-widest border-b border-black hover:opacity-70"
          >
            전체 기록 보기
          </Link>
        </div>

        {/* 모바일: 카드 목록 */}
        <div className="sm:hidden divide-y divide-gray-100">
          {data.recentTrips.length === 0 && (
            <div className="px-4 py-12 text-center text-gray-400 text-sm">
              운행 기록이 없습니다.{" "}
              <Link href="/logs/track" className="text-black font-bold underline">운행 시작하기</Link>
            </div>
          )}
          {data.recentTrips.map((trip) => {
            const status = STATUS_LABEL[trip.status] ?? STATUS_LABEL.PENDING;
            return (
              <div key={trip.id} className="px-4 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-bold truncate">{trip.vehicle.make} {trip.vehicle.model}</span>
                    <span className="text-xs text-gray-400 shrink-0">{trip.vehicle.licensePlate}</span>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ml-2 ${status.className}`}>{status.label}</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">{trip.driver.name}</p>
                <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                  <span className="truncate">{trip.startAddress}</span>
                  <span className="shrink-0 mx-1">→</span>
                  <span className="truncate">{trip.endAddress ?? "—"}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{trip.distanceKm.toFixed(1)} km</span>
                  <span>·</span>
                  <span className="truncate">{trip.purpose ?? (trip.purposeCode ? trip.purposeCode.replace(/_/g, " ") : "목적 미입력")}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 데스크탑: 테이블 */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["차량", "운전자", "출발지", "도착지", "출발 km", "도착 km", "이동 거리", "목적", "상태", "경로"].map((h) => (
                  <th
                    key={h}
                    className={`px-6 py-4 text-xs font-black text-[#0a0a0a] uppercase tracking-widest ${h === "상태" ? "text-right" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.recentTrips.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-10 py-12 text-center text-gray-400 text-base">
                    운행 기록이 없습니다.{" "}
                    <Link href="/logs/track" className="text-black font-bold underline">
                      운행 시작하기
                    </Link>
                  </td>
                </tr>
              )}
              {data.recentTrips.map((trip) => {
                const status = STATUS_LABEL[trip.status] ?? STATUS_LABEL.PENDING;
                return (
                  <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-[#0a0a0a]">
                          <span className="material-symbols-outlined text-base">directions_car</span>
                        </div>
                        <div>
                          <p className="text-sm text-[#0a0a0a]">
                            {trip.vehicle.make} {trip.vehicle.model}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{trip.vehicle.licensePlate}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#0a0a0a]">{trip.driver.name}</td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <p className="text-sm text-[#0a0a0a] truncate">{trip.startAddress}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(trip.startTime).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <p className="text-sm text-[#0a0a0a] truncate">{trip.endAddress ?? "—"}</p>
                      {trip.endTime && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(trip.endTime).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0a0a0a]">
                      {(trip as any).startOdometer != null
                        ? `${((trip as any).startOdometer as number).toLocaleString()} km`
                        : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0a0a0a]">
                      {(trip as any).endOdometer != null
                        ? `${((trip as any).endOdometer as number).toLocaleString()} km`
                        : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0a0a0a]">
                      {trip.distanceKm.toFixed(1)} km
                    </td>
                    <td className="px-6 py-4 text-sm text-[#0a0a0a]">
                      {trip.purpose ?? (trip.purposeCode ? trip.purposeCode.replace(/_/g, " ") : "—")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <TripRouteButton
                        tripId={trip.id}
                        startAddress={trip.startAddress}
                        endAddress={trip.endAddress}
                        startLat={trip.startLat}
                        startLng={trip.startLng}
                        endLat={trip.endLat}
                        endLng={trip.endLng}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      </div>
    </div>
  );
}
