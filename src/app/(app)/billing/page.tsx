"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { PLANS } from "@/lib/plans";

type BillingCycle = "monthly" | "yearly";

export default function BillingPage() {
  const { data: session } = useSession();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(planName: string) {
    if (planName === "ENTERPRISE") {
      window.location.href = "mailto:sales@fleetsentinel.io";
      return;
    }
    setLoading(planName);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planName, cycle }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    setLoading(null);
  }

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  return (
    <div className="px-4 sm:px-8 md:px-12 py-6 md:py-10 max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="mb-12">
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">구독 관리</h1>
        <p className="text-gray-500 mt-2">FleetSentinel 구독 플랜 및 청구 내역 관리</p>
      </div>

      {/* 현재 플랜 상태 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-8 mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">현재 플랜</p>
            <p className="text-2xl font-extrabold">14일 무료 체험 중</p>
            <p className="text-sm text-gray-500 mt-1">체험 기간 종료 전 구독하면 데이터가 유지됩니다.</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-lg">
            <p className="text-[10px] font-black text-yellow-700 uppercase tracking-widest">TRIAL</p>
          </div>
        </div>
      </div>

      {/* 결제 주기 토글 */}
      <div className="flex items-center justify-center gap-4 mb-12">
        <span className={`text-sm font-bold ${cycle === "monthly" ? "text-black" : "text-gray-400"}`}>월간 결제</span>
        <button
          onClick={() => setCycle((c) => c === "monthly" ? "yearly" : "monthly")}
          className={`relative w-12 h-6 rounded-full transition-colors ${cycle === "yearly" ? "bg-black" : "bg-gray-200"}`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${cycle === "yearly" ? "left-7" : "left-1"}`} />
        </button>
        <span className={`text-sm font-bold ${cycle === "yearly" ? "text-black" : "text-gray-400"}`}>
          연간 결제
          <span className="ml-2 text-[10px] font-black bg-black text-white px-2 py-0.5 rounded uppercase tracking-wider">20% 할인</span>
        </span>
      </div>

      {/* 요금제 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {Object.values(PLANS).map((plan) => {
          const price = cycle === "yearly" ? plan.priceYearlyKrw : plan.priceMonthlyKrw;
          const monthlyEquiv = cycle === "yearly" && plan.priceYearlyKrw > 0
            ? Math.round(plan.priceYearlyKrw / 12)
            : plan.priceMonthlyKrw;
          const isBusiness = plan.name === "BUSINESS";

          return (
            <div
              key={plan.name}
              className={`rounded-xl border p-8 flex flex-col ${isBusiness ? "border-black bg-black text-white" : "border-gray-200 bg-white"}`}
            >
              <p className={`text-[10px] font-black uppercase tracking-widest mb-4 ${isBusiness ? "text-gray-400" : "text-gray-400"}`}>
                {plan.displayName}
              </p>
              <div className="mb-6">
                {plan.priceMonthlyKrw === 0 ? (
                  <div className="text-3xl font-extrabold">협의</div>
                ) : (
                  <>
                    <div className="text-4xl font-extrabold">
                      {monthlyEquiv.toLocaleString()}원
                      <span className={`text-sm font-normal ml-1 ${isBusiness ? "text-gray-400" : "text-gray-400"}`}>/월</span>
                    </div>
                    {cycle === "yearly" && (
                      <div className={`text-xs mt-1 ${isBusiness ? "text-gray-300" : "text-gray-500"}`}>
                        연 {price.toLocaleString()}원 청구
                      </div>
                    )}
                  </>
                )}
                <div className={`text-sm mt-2 font-bold ${isBusiness ? "text-gray-300" : "text-gray-500"}`}>
                  차량 {plan.maxVehicles === -1 ? "무제한" : `최대 ${plan.maxVehicles}대`}
                </div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <span className={`material-symbols-outlined text-base mt-0.5 ${isBusiness ? "text-gray-300" : "text-gray-400"}`}>check_circle</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {isAdmin && (
                <button
                  onClick={() => handleCheckout(plan.name)}
                  disabled={loading === plan.name}
                  className={`w-full py-3 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 ${
                    isBusiness
                      ? "bg-white text-black hover:bg-gray-100"
                      : plan.name === "ENTERPRISE"
                      ? "border-2 border-black text-black hover:bg-black hover:text-white"
                      : "bg-black text-white hover:bg-gray-800"
                  }`}
                >
                  {loading === plan.name
                    ? "처리 중..."
                    : plan.priceMonthlyKrw === 0
                    ? "영업팀 문의"
                    : "이 플랜 선택"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 안내 */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-sm text-gray-500 space-y-2">
        <p>• 구독 취소 시 현재 기간 종료 후 해지됩니다.</p>
        <p>• 세금계산서는 매월 자동 발행됩니다. (사업자등록번호 등록 필요)</p>
        <p>• 차량 수 초과 시 상위 플랜으로 자동 업그레이드 안내가 발송됩니다.</p>
        <p>• 연간 결제 후 환불은 사용 월 차감 후 잔여금 환급입니다.</p>
      </div>
    </div>
  );
}
