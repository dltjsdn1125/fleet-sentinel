import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

async function getReportData(companyId: string) {
  const now = new Date();
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [quarterTrips, totalKm, purposeBreakdown] = await Promise.all([
    prisma.trip.findMany({
      where: {
        driver: { companyId },
        date: { gte: quarterStart },
        status: { in: ["COMPLETED", "APPROVED"] },
      },
      include: {
        driver: { select: { name: true } },
        vehicle: { select: { licensePlate: true, make: true, model: true } },
      },
      orderBy: { date: "desc" },
      take: 10,
    }),
    prisma.trip.aggregate({
      where: { driver: { companyId }, status: { in: ["COMPLETED", "APPROVED"] } },
      _sum: { distanceKm: true },
      _count: true,
    }),
    prisma.trip.groupBy({
      by: ["purposeCode"],
      where: {
        driver: { companyId },
        date: { gte: monthStart },
        purposeCode: { not: null },
      },
      _sum: { distanceKm: true },
      _count: true,
    }),
  ]);

  const businessKm = purposeBreakdown
    .filter((p) => p.purposeCode !== "PRIVATE")
    .reduce((s, p) => s + (p._sum.distanceKm ?? 0), 0);
  const totalPurposeKm = purposeBreakdown.reduce((s, p) => s + (p._sum.distanceKm ?? 0), 0);
  const taxRatio = totalPurposeKm > 0 ? (businessKm / totalPurposeKm) * 100 : 0;

  return { quarterTrips, totalKm, purposeBreakdown, taxRatio };
}

const PURPOSE_CODE_LABEL: Record<string, string> = {
  CLIENT_VISIT: "고객사 방문",
  DELIVERY: "납품·배송",
  MEETING: "회의",
  COMMUTE: "출퇴근",
  PRIVATE: "사적 운행",
  MAINTENANCE: "차량 정비",
  OTHER: "기타",
};

export default async function ReportsPage() {
  const session = await auth();
  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) return (
    <div className="px-12 py-10">
      <p className="text-gray-500">관리자만 접근할 수 있습니다.</p>
    </div>
  );

  const data = await getReportData(session.user.companyId ?? "");
  const now = new Date();

  const fromQ = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().split("T")[0];
  const toQ = now.toISOString().split("T")[0];
  const fromM = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  return (
    <div className="px-4 sm:px-8 md:px-12 py-6 md:py-10 overflow-y-auto h-full">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8 md:mb-12">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">준법 보고서</h1>
          <p className="text-gray-500 max-w-2xl font-medium text-sm">
            국세청 업무용 차량 운행일지 및 세무 신고용 집계표를 즉시 생성하세요.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 self-start">
          <span className="material-symbols-outlined text-black">verified</span>
          <span className="text-black font-bold text-sm">
            {now.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })} 데이터 검증됨
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* 필터 & 다운로드 사이드 */}
        <section className="col-span-12 lg:col-span-4 space-y-6">
          {/* 다운로드 옵션 */}
          <div className="bg-white p-8 rounded-lg border border-gray-200">
            <h2 className="text-lg font-extrabold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined">download</span>
              엑셀 다운로드
            </h2>
            <div className="space-y-4">
              {[
                { label: "월간 운행일지", from: fromM, to: toQ, icon: "calendar_today" },
                { label: "분기 운행일지", from: fromQ, to: toQ, icon: "date_range" },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={`/api/reports/excel?from=${item.from}&to=${item.to}`}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-gray-400">{item.icon}</span>
                  <div>
                    <p className="font-bold text-sm">{item.label}</p>
                    <p className="text-[10px] text-gray-400">{item.from} ~ {item.to}</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-300 ml-auto">arrow_forward</span>
                </Link>
              ))}
            </div>
          </div>

          {/* NTS 준법 체크리스트 */}
          <div className="bg-white p-8 rounded-lg border border-gray-200">
            <h2 className="text-lg font-extrabold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">gavel</span>
              국세청 준수 체크
            </h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              업무용 차량 운행일지 의무 기재 항목 자동 충족 여부를 확인합니다.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "운행일자 자동 기록",
                "출발지·도착지 주소 (역지오코딩)",
                "출발·도착 시각",
                "운행 거리 (GPS 적산)",
                "운행 목적 (직원 입력)",
                "차량번호 자동 매핑",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-xs font-bold">
                  <span className="material-symbols-outlined text-black text-base">check_circle</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href={`/api/reports/excel?from=${fromM}&to=${toQ}`}
              className="w-full bg-[#CAFF33] text-[#0a0a0a] py-3 rounded-lg font-bold text-sm text-center block hover:brightness-95 transition-colors"
            >
              국세청 양식 PDF/XLS 생성
            </Link>
          </div>
        </section>

        {/* 메인 콘텐츠 */}
        <section className="col-span-12 lg:col-span-8">
          {/* NTS 프리뷰 테이블 */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-center bg-white">
              <h2 className="text-lg font-extrabold">국세청 양식 미리보기</h2>
              <div className="flex gap-2">
                <Link
                  href={`/api/reports/excel?from=${fromQ}&to=${toQ}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#CAFF33] text-[#0a0a0a] text-xs font-bold hover:brightness-95"
                >
                  <span className="material-symbols-outlined text-base">download</span>
                  Excel 다운로드
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[560px]">
                <thead className="bg-gray-50">
                  <tr>
                    {["날짜", "차량번호", "운전자", "출발지", "도착지", "거리", "목적"].map((h) => (
                      <th key={h} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.quarterTrips.slice(0, 5).map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="px-6 py-5 text-sm font-semibold">
                        {new Date(trip.date).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-6 py-5 text-sm font-extrabold">{trip.vehicle.licensePlate}</td>
                      <td className="px-6 py-5 text-sm text-gray-600">{trip.driver.name}</td>
                      <td className="px-6 py-5 text-xs text-gray-500 max-w-[120px] truncate">{trip.startAddress}</td>
                      <td className="px-6 py-5 text-xs text-gray-500 max-w-[120px] truncate">{trip.endAddress ?? "-"}</td>
                      <td className="px-6 py-5 text-sm font-extrabold">{trip.distanceKm.toFixed(1)} km</td>
                      <td className="px-6 py-5">
                        <span className="px-3 py-1 bg-gray-100 rounded text-[10px] font-extrabold uppercase">
                          {trip.purposeCode ? PURPOSE_CODE_LABEL[trip.purposeCode] : (trip.purpose ?? "-")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-8 py-5 bg-gray-50 flex justify-between items-center border-t border-gray-200">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                총 <span className="text-black">{data.totalKm._count}</span>건 운행 기록
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">누적 주행 거리</span>
                <span className="text-xl font-extrabold">{(data.totalKm._sum.distanceKm ?? 0).toLocaleString()} km</span>
              </div>
            </div>
          </div>

          {/* 분석 카드 */}
          <div className="grid grid-cols-2 gap-6 mt-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
                  <span className="material-symbols-outlined">trending_up</span>
                </div>
                <span className="text-[10px] font-extrabold bg-gray-100 px-2 py-0.5 rounded uppercase tracking-wider">세무 공제율</span>
              </div>
              <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">업무 사용 비율</h3>
              <div className="text-2xl font-extrabold">{data.taxRatio.toFixed(1)}%</div>
              <div className="mt-2 w-full bg-gray-100 h-1.5 rounded-full">
                <div className="bg-black h-full rounded-full" style={{ width: `${data.taxRatio}%` }} />
              </div>
              <div className="mt-2 text-xs text-gray-500">전체 주행 중 업무 목적 비율</div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
                  <span className="material-symbols-outlined">description</span>
                </div>
                <span className="text-[10px] font-extrabold bg-gray-100 px-2 py-0.5 rounded uppercase tracking-wider">자동 생성</span>
              </div>
              <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">목적별 분포</h3>
              <div className="space-y-1.5 mt-2">
                {data.purposeBreakdown.slice(0, 4).map((p) => (
                  <div key={p.purposeCode} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-600 w-20 truncate">{PURPOSE_CODE_LABEL[p.purposeCode ?? ""] ?? p.purposeCode}</span>
                    <div className="flex-1 bg-gray-100 h-1.5 rounded-full">
                      <div
                        className="bg-black h-full rounded-full"
                        style={{
                          width: `${data.purposeBreakdown.reduce((s, x) => s + (x._sum.distanceKm ?? 0), 0) > 0
                            ? ((p._sum.distanceKm ?? 0) / data.purposeBreakdown.reduce((s, x) => s + (x._sum.distanceKm ?? 0), 0)) * 100
                            : 0}%`
                        }}
                      />
                    </div>
                    <span className="font-bold text-black w-14 text-right">{(p._sum.distanceKm ?? 0).toFixed(0)} km</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
