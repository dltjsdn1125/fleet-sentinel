"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function safeInternalPath(raw: string | null, fallback: string) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const callbackUrl = safeInternalPath(searchParams.get("callbackUrl"), "/dashboard");

  const hasGoogle = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const hasKakao = Boolean(process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.ok) { window.location.assign(callbackUrl); return; }
      if (result?.error === "Configuration") {
        setError("인증 설정 오류입니다. AUTH_SECRET 환경변수를 확인하세요.");
      } else if ((result?.status ?? 0) >= 500) {
        setError("서버 오류입니다. 잠시 후 다시 시도해주세요.");
      } else {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="text-2xl font-extrabold tracking-tight uppercase">FleetSentinel</Link>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">법인차량 관리 시스템</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h1 className="text-2xl font-extrabold mb-1">로그인</h1>
          <p className="text-gray-400 text-sm mb-7">기업 계정으로 로그인하세요</p>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              {error}
            </div>
          )}

          {/* 소셜 로그인 버튼 */}
          {(hasGoogle || hasKakao) && (
            <div className="space-y-3 mb-6">
              {hasGoogle && (
                <button type="button"
                  onClick={() => signIn("google", { callbackUrl })}
                  className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 font-semibold text-sm hover:bg-gray-50 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62z"/>
                    <path fill="#34A853" d="M9 18a8.59 8.59 0 0 0 5.96-2.18l-2.92-2.26a5.43 5.43 0 0 1-8.07-2.85H.96v2.32A9 9 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.97H.96a9 9 0 0 0 0 8.06z"/>
                    <path fill="#EA4335" d="M9 3.58a4.86 4.86 0 0 1 3.44 1.35L14.5 2.9A8.66 8.66 0 0 0 9 .5 9 9 0 0 0 .96 4.97l3 2.32A5.36 5.36 0 0 1 9 3.58z"/>
                  </svg>
                  Google로 로그인
                </button>
              )}
              {hasKakao && (
                <button type="button"
                  onClick={() => signIn("kakao", { callbackUrl })}
                  className="w-full flex items-center justify-center gap-3 rounded-xl py-3 font-semibold text-sm transition-colors"
                  style={{ backgroundColor: "#FEE500", color: "#000" }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd"
                      d="M9 1.5C4.858 1.5 1.5 4.134 1.5 7.387c0 2.07 1.376 3.888 3.45 4.93l-.878 3.24a.281.281 0 0 0 .432.3L8.42 13.49A8.864 8.864 0 0 0 9 13.5c4.142 0 7.5-2.634 7.5-5.887S13.142 1.5 9 1.5z"
                      fill="#000"/>
                  </svg>
                  카카오로 로그인
                </button>
              )}
              <div className="flex items-center gap-4 pt-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-bold uppercase">또는 이메일</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">이메일</label>
              <input type="email" autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CAFF33]"
                placeholder="name@company.com" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">비밀번호</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#CAFF33]"
                  placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined text-lg">{showPw ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-[#0a0a0a] text-white py-3.5 rounded-xl font-black text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-gray-400">
            계정이 없으신가요?{" "}
            <Link href="/register" className="text-black font-bold hover:underline">회원가입</Link>
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
