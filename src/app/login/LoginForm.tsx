"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "1";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      setLoading(false);
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="text-2xl font-extrabold tracking-tight uppercase">FleetSentinel</Link>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">Compliance v2.1</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h1 className="text-2xl font-extrabold mb-2">로그인</h1>
          <p className="text-gray-400 text-sm mb-8">법인 차량일지 관리 시스템</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}

          {googleAuthEnabled && (
            <>
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl })}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-lg py-3 font-semibold text-sm hover:bg-gray-50 transition-colors mb-6"
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62z"/>
                  <path fill="#34A853" d="M9 18a8.59 8.59 0 0 0 5.96-2.18l-2.92-2.26a5.43 5.43 0 0 1-8.07-2.85H.96v2.32A9 9 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.97H.96a9 9 0 0 0 0 8.06z"/>
                  <path fill="#EA4335" d="M9 3.58a4.86 4.86 0 0 1 3.44 1.35L14.5 2.9A8.66 8.66 0 0 0 9 .5 9 9 0 0 0 .96 4.97l3 2.32A5.36 5.36 0 0 1 9 3.58z"/>
                </svg>
                Google로 로그인
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-gray-400 font-bold uppercase">또는</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">이메일</label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="name@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">비밀번호</label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-black text-white py-3 rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors disabled:opacity-50">
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            계정이 없으신가요? <Link href="/register" className="text-black font-bold hover:underline">회원가입</Link>
          </div>
        </div>

        <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl text-xs text-gray-400">
          <p className="font-bold text-gray-600 mb-2">데모 계정</p>
          <p>관리자: <span className="font-mono text-gray-700">admin@demo.com</span> / <span className="font-mono text-gray-700">demo1234</span></p>
          <p className="mt-1">직원: <span className="font-mono text-gray-700">driver@demo.com</span> / <span className="font-mono text-gray-700">demo1234</span></p>
        </div>
      </div>
    </div>
  );
}
