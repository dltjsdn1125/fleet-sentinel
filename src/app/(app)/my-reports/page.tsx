"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface Report {
  id: string;
  type: string;
  periodStart: string;
  periodEnd: string;
  content: string | null;
  status: string;
  totalTrips: number;
  totalKm: number;
  totalExpenses: number;
  createdAt: string;
  driver: { name: string; email: string };
}

const TYPE_CONFIG = {
  DAILY:   { label: "일보고",  icon: "today",           color: "bg-blue-100 text-blue-700" },
  WEEKLY:  { label: "주보고",  icon: "date_range",      color: "bg-purple-100 text-purple-700" },
  MONTHLY: { label: "월보고",  icon: "calendar_month",  color: "bg-orange-100 text-orange-700" },
};

const STATUS_CONFIG = {
  SUBMITTED: { label: "제출완료", className: "bg-[#CAFF33]/20 text-[#4a6400] border border-[#CAFF33]/40" },
  REVIEWED:  { label: "검토중",   className: "bg-blue-100 text-blue-700 border border-blue-200" },
  APPROVED:  { label: "승인",     className: "bg-[#CAFF33] text-[#0a0a0a] border border-[#CAFF33]" },
};

function getWeekRange(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().split("T")[0],
    end:   sun.toISOString().split("T")[0],
  };
}

function getMonthRange(date: Date) {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split("T")[0],
    end:   new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split("T")[0],
  };
}

export default function MyReportsPage() {
  const { data: session } = useSession();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const week  = getWeekRange(new Date());
  const month = getMonthRange(new Date());

  const [type, setType]       = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  const [dateVal, setDateVal] = useState(today);
  const [content, setContent] = useState("");

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/reports/submit");
    const data = await res.json();
    setReports(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  function getPeriod() {
    if (type === "DAILY")   return { start: dateVal,    end: dateVal };
    if (type === "WEEKLY")  return getWeekRange(new Date(dateVal));
    return getMonthRange(new Date(dateVal));
  }

  async function submit() {
    const { start, end } = getPeriod();
    setSubmitting(true);
    await fetch("/api/reports/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, periodStart: start, periodEnd: end, content }),
    });
    setSubmitting(false);
    setShowForm(false);
    setContent("");
    fetchReports();
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/reports/submit", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchReports();
  }

  const period = getPeriod();

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-8 py-8">
        {/* 헤더 */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              <span>FleetSentinel</span>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-[#0a0a0a]">{isAdmin ? "보고서 관리" : "업무 보고"}</span>
            </nav>
            <h1 className="text-4xl font-black tracking-tight">{isAdmin ? "보고서 관리" : "업무 보고"}</h1>
            <p className="text-gray-500 mt-1.5 text-sm">
              {isAdmin
                ? "직원별 일·주·월 업무 보고 내역 확인 및 승인"
                : "일보고·주보고·월보고 제출 — 운행·경비가 자동 집계됩니다"}
            </p>
          </div>
          {!isAdmin && (
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-[#CAFF33] text-[#0a0a0a] rounded-lg font-bold flex items-center gap-2 hover:brightness-95"
            >
              <span className="material-symbols-outlined text-lg">edit_note</span>
              보고서 제출
            </button>
          )}
        </div>

        {/* 통계 요약 (본인) */}
        {!isAdmin && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "전체 제출", value: reports.length, icon: "description" },
              { label: "승인 완료", value: reports.filter((r) => r.status === "APPROVED").length, icon: "check_circle" },
              { label: "검토 대기", value: reports.filter((r) => r.status === "SUBMITTED").length, icon: "schedule" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#0a0a0a]">{s.icon}</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
                  <p className="text-2xl font-black">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 보고서 목록 */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {(isAdmin
                  ? ["제출자", "구분", "기간", "운행", "총 거리", "경비", "내용", "상태", ""]
                  : ["구분", "기간", "운행", "총 거리", "경비", "내용", "상태"]
                ).map((h, i) => (
                  <th key={i} className="px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr><td colSpan={9} className="py-16 text-center text-sm text-gray-400">불러오는 중...</td></tr>
              )}
              {!loading && reports.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-200 block mb-2">description</span>
                    <p className="text-sm text-gray-400">제출된 보고서가 없습니다.</p>
                  </td>
                </tr>
              )}
              {reports.map((r) => {
                const tc  = TYPE_CONFIG[r.type as keyof typeof TYPE_CONFIG];
                const sc  = STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.SUBMITTED;
                const s   = new Date(r.periodStart).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
                const e   = new Date(r.periodEnd).toLocaleDateString("ko-KR",   { month: "short", day: "numeric" });
                const period = r.type === "DAILY" ? s : `${s} ~ ${e}`;

                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    {isAdmin && (
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-bold text-[#0a0a0a]">{r.driver.name}</p>
                          <p className="text-xs text-gray-400">{r.driver.email}</p>
                        </div>
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${tc?.color ?? "bg-gray-100 text-gray-600"}`}>
                        <span className="material-symbols-outlined text-xs">{tc?.icon}</span>
                        {tc?.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#0a0a0a] whitespace-nowrap">{period}</td>
                    <td className="px-5 py-4 text-sm font-black">{r.totalTrips}건</td>
                    <td className="px-5 py-4 text-sm font-black">{r.totalKm.toFixed(1)} km</td>
                    <td className="px-5 py-4 text-sm font-semibold">{r.totalExpenses.toLocaleString()}원</td>
                    <td className="px-5 py-4 text-sm text-gray-500 max-w-[200px] truncate">{r.content ?? "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${sc.className}`}>
                        {sc.label}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-4">
                        {r.status !== "APPROVED" && (
                          <button
                            onClick={() => updateStatus(r.id, r.status === "SUBMITTED" ? "REVIEWED" : "APPROVED")}
                            className="text-xs font-bold px-3 py-1.5 bg-[#CAFF33] text-[#0a0a0a] rounded-lg hover:brightness-95"
                          >
                            {r.status === "SUBMITTED" ? "검토" : "승인"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 보고서 제출 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black">보고서 제출</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-black">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-5">
              {/* 보고 구분 */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">보고 구분</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((t) => {
                    const c = TYPE_CONFIG[t];
                    return (
                      <button
                        key={t}
                        onClick={() => setType(t)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                          type === t ? "border-[#CAFF33] bg-[#CAFF33]/10" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl">{c.icon}</span>
                        <span className="text-xs font-bold">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 기준 날짜 */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  기준 날짜
                  {type !== "DAILY" && <span className="ml-1 text-[#CAFF33] font-black">(기간 자동 산출)</span>}
                </label>
                <input
                  type="date"
                  value={dateVal}
                  onChange={(e) => setDateVal(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-black"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  집계 기간:&nbsp;
                  <span className="font-bold text-[#0a0a0a]">
                    {type === "DAILY"
                      ? dateVal
                      : `${period.start} ~ ${period.end}`}
                  </span>
                </p>
              </div>

              {/* 추가 코멘트 */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">추가 코멘트</label>
                <textarea
                  rows={3}
                  placeholder="특이사항, 이슈, 추가 설명 등을 입력하세요"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black resize-none"
                />
              </div>

              {/* 자동 집계 안내 */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 space-y-1">
                <p className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#CAFF33]">auto_awesome</span>
                  해당 기간의 운행 건수·총 거리·경비가 자동으로 집계됩니다
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#CAFF33]">notifications</span>
                  제출 즉시 관리자 페이지에 보고됩니다
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 border border-gray-200 rounded-lg font-bold text-sm">취소</button>
              <button onClick={submit} disabled={submitting}
                className="flex-1 py-3 bg-[#CAFF33] text-[#0a0a0a] rounded-lg font-bold text-sm hover:brightness-95 disabled:opacity-50">
                {submitting ? "제출 중..." : "제출"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
