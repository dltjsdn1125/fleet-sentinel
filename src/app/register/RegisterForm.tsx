"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PLANS } from "@/lib/plans";

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = (searchParams.get("plan") ?? "starter").toUpperCase() as keyof typeof PLANS;
  const selectedPlan = PLANS[planParam] ?? PLANS.STARTER;
  const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "1";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [bizNumber, setBizNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, companyName, bizNumber, plan: planParam }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "회원가입 실패");
        setLoading(false);
        return;
      }

      const loginResult = await signIn("credentials", { email, password, redirect: false });
      router.push(loginResult?.ok ? "/dashboard" : "/login");
    } catch {
      setError("서버 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <Link href="/" className="text-2xl font-extrabold tracking-tight uppercase">FleetSentinel</Link>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">14일 무료 체험</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">선택 플랜</p>
            <p className="font-extrabold">{selectedPlan.displayName}</p>
          </div>
          <div className="text-right">
            <p className="font-extrabold">
              {selectedPlan.priceMonthlyKrw === 0 ? "협의" : `${selectedPlan.priceMonthlyKrw.toLocaleString()}원/월`}
            </p>
            <p className="text-[10px] text-gray-400">14일 무료 후 과금</p>
          </div>
          <Link href="/#pricing" className="text-xs font-bold text-gray-400 hover:text-black underline">변경</Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h1 className="text-2xl font-extrabold mb-2">회원가입</h1>
          <p className="text-gray-400 text-sm mb-8">신용카드 불필요 · 14일 무료</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">{error}</div>
          )}

          {googleAuthEnabled && (
            <>
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-lg py-3 font-semibold text-sm hover:bg-gray-50 transition-colors mb-6"
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62z"/>
                  <path fill="#34A853" d="M9 18a8.59 8.59 0 0 0 5.96-2.18l-2.92-2.26a5.43 5.43 0 0 1-8.07-2.85H.96v2.32A9 9 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.97H.96a9 9 0 0 0 0 8.06z"/>
                  <path fill="#EA4335" d="M9 3.58a4.86 4.86 0 0 1 3.44 1.35L14.5 2.9A8.66 8.66 0 0 0 9 .5 9 9 0 0 0 .96 4.97l3 2.32A5.36 5.36 0 0 1 9 3.58z"/>
                </svg>
                Google로 시작하기
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-gray-400 font-bold uppercase">또는 이메일로</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
            </>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">이름</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="홍길동" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">회사명</label>
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="(주)예시기업" required />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">이메일</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="name@company.com" required />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                사업자등록번호 <span className="text-gray-300">(선택)</span>
              </label>
              <input value={bizNumber} onChange={(e) => setBizNumber(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="123-45-67890" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">비밀번호</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="8자 이상" minLength={8} required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-black text-white py-3 rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors disabled:opacity-50">
              {loading ? "처리 중..." : "무료 체험 시작"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-400">
            가입 시 <a href="#" className="underline">이용약관</a> 및 <a href="#" className="underline">개인정보처리방침</a>에 동의합니다.
          </p>
        </div>

        <div className="text-center mt-4 text-sm text-gray-400">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-black font-bold hover:underline">로그인</Link>
        </div>
      </div>
    </div>
  );
}
