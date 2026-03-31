"use client";
import { useState, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PLANS } from "@/lib/plans";

const INDUSTRIES = [
  "제조업", "건설업", "도소매업", "운수·창고업", "정보통신업",
  "금융·보험업", "부동산업", "전문·과학·기술 서비스업",
  "사업시설 관리·지원 서비스업", "교육 서비스업", "보건·사회복지 서비스업",
  "예술·스포츠·여가 서비스업", "기타 서비스업",
];

// 사업자등록번호 포맷 (000-00-00000)
function formatBizNumber(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = (searchParams.get("plan") ?? "starter").toUpperCase() as keyof typeof PLANS;
  const selectedPlan = PLANS[planParam] ?? PLANS.STARTER;

  // 소셜 프로바이더 가용 여부 (빌드 타임 env)
  const hasGoogle = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const hasKakao = Boolean(process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID);

  // 기본 정보
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // 기업 정보
  const [companyName, setCompanyName] = useState("");
  const [bizNumber, setBizNumber] = useState("");
  const [ceoName, setCeoName] = useState("");
  const [industry, setIndustry] = useState("");

  // 사업자등록증 첨부
  const [bizDocFile, setBizDocFile] = useState<File | null>(null);
  const [bizDocUrl, setBizDocUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // 2단계 폼

  // 파일 선택 처리
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBizDocFile(file);

    // 즉시 업로드
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/biz-doc", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setBizDocUrl(data.url);
      } else {
        setError(data.error ?? "파일 업로드 실패");
        setBizDocFile(null);
      }
    } catch {
      setError("파일 업로드 중 오류가 발생했습니다.");
      setBizDocFile(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, password,
          companyName, bizNumber, ceoName, industry,
          bizDocUrl: bizDocUrl || undefined,
          plan: planParam,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "회원가입 실패"); return; }

      const loginResult = await signIn("credentials", { email, password, redirect: false });
      router.push(loginResult?.ok ? "/dashboard" : "/login");
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const SocialButtons = () => (
    <div className="space-y-3 mb-6">
      {hasGoogle && (
        <button type="button"
          onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 font-semibold text-sm hover:bg-gray-50 transition-colors">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62z"/>
            <path fill="#34A853" d="M9 18a8.59 8.59 0 0 0 5.96-2.18l-2.92-2.26a5.43 5.43 0 0 1-8.07-2.85H.96v2.32A9 9 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.97H.96a9 9 0 0 0 0 8.06z"/>
            <path fill="#EA4335" d="M9 3.58a4.86 4.86 0 0 1 3.44 1.35L14.5 2.9A8.66 8.66 0 0 0 9 .5 9 9 0 0 0 .96 4.97l3 2.32A5.36 5.36 0 0 1 9 3.58z"/>
          </svg>
          Google로 시작하기
        </button>
      )}
      {hasKakao && (
        <button type="button"
          onClick={() => signIn("kakao", { callbackUrl: "/onboarding" })}
          className="w-full flex items-center justify-center gap-3 rounded-xl py-3 font-semibold text-sm transition-colors"
          style={{ backgroundColor: "#FEE500", color: "#000" }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path fillRule="evenodd" clipRule="evenodd"
              d="M9 1.5C4.858 1.5 1.5 4.134 1.5 7.387c0 2.07 1.376 3.888 3.45 4.93l-.878 3.24a.281.281 0 0 0 .432.3L8.42 13.49A8.864 8.864 0 0 0 9 13.5c4.142 0 7.5-2.634 7.5-5.887S13.142 1.5 9 1.5z"
              fill="#000"/>
          </svg>
          카카오로 시작하기
        </button>
      )}
      {(hasGoogle || hasKakao) && (
        <div className="flex items-center gap-4 pt-1">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-bold uppercase">또는 이메일로</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-extrabold tracking-tight uppercase">FleetSentinel</Link>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">기업 법인차량 관리 시스템</p>
        </div>

        {/* 플랜 배너 */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 flex items-center justify-between">
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
          <Link href="/#pricing" className="text-xs font-bold text-gray-400 hover:text-black underline ml-4">변경</Link>
        </div>

        {/* 스텝 인디케이터 */}
        <div className="flex items-center gap-2 mb-5">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                step >= s ? "bg-[#0a0a0a] text-white" : "bg-gray-200 text-gray-400"
              }`}>{s}</div>
              <span className={`text-xs font-bold ${step >= s ? "text-[#0a0a0a]" : "text-gray-400"}`}>
                {s === 1 ? "계정 정보" : "기업 정보"}
              </span>
              {s < 2 && <div className={`flex-1 h-px ${step > s ? "bg-[#0a0a0a]" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8">
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              {error}
            </div>
          )}

          {/* ── STEP 1: 계정 정보 ── */}
          {step === 1 && (
            <>
              <h1 className="text-xl font-extrabold mb-1">계정 정보 입력</h1>
              <p className="text-gray-400 text-sm mb-6">소셜 계정으로 빠르게 시작하거나 이메일로 가입하세요</p>

              <SocialButtons />

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">담당자명 *</label>
                    <input value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CAFF33]"
                      placeholder="홍길동" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">이메일 *</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CAFF33]"
                      placeholder="name@company.com" required />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">비밀번호 *</label>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#CAFF33]"
                      placeholder="8자 이상" minLength={8} required />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <span className="material-symbols-outlined text-lg">{showPw ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                </div>
                <button type="button"
                  disabled={!name || !email || password.length < 8}
                  onClick={() => { setError(""); setStep(2); }}
                  className="w-full bg-[#0a0a0a] text-white py-3.5 rounded-xl font-black text-sm hover:bg-gray-800 disabled:opacity-40 transition-colors">
                  다음 단계 →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: 기업 정보 ── */}
          {step === 2 && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold mb-1">기업 정보 입력</h1>
                <p className="text-gray-400 text-sm mb-6">법인차량 관리를 위한 사업자 정보를 입력해주세요</p>
              </div>

              {/* 회사명 + 대표자명 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">회사명 *</label>
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CAFF33]"
                    placeholder="(주)예시기업" required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">대표자명</label>
                  <input value={ceoName} onChange={(e) => setCeoName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CAFF33]"
                    placeholder="홍길동" />
                </div>
              </div>

              {/* 사업자등록번호 */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  사업자등록번호
                </label>
                <input value={bizNumber}
                  onChange={(e) => setBizNumber(formatBizNumber(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CAFF33] font-mono"
                  placeholder="000-00-00000" maxLength={12} />
              </div>

              {/* 업종 */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">업종</label>
                <select value={industry} onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CAFF33]">
                  <option value="">업종 선택</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              {/* 사업자등록증 첨부 */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  사업자등록증 첨부
                  <span className="ml-1 text-gray-300 font-normal normal-case tracking-normal">(PDF·JPG·PNG, 10MB 이하)</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                    bizDocFile
                      ? "border-[#CAFF33] bg-[#CAFF33]/10"
                      : "border-gray-200 hover:border-gray-300 bg-gray-50"
                  }`}>
                  <input ref={fileInputRef} type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange} className="hidden" />
                  {uploading ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                      업로드 중...
                    </div>
                  ) : bizDocFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-lg text-[#5a7a00]">check_circle</span>
                      <span className="text-sm font-bold text-[#0a0a0a] truncate max-w-[200px]">{bizDocFile.name}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setBizDocFile(null); setBizDocUrl(""); }}
                        className="text-gray-400 hover:text-red-500 ml-1">
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <span className="material-symbols-outlined text-2xl text-gray-300">upload_file</span>
                      <p className="text-sm text-gray-500">클릭하여 파일 선택</p>
                      <p className="text-xs text-gray-400">사업자등록증을 첨부하면 빠른 승인이 가능합니다</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 py-3.5 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50">
                  ← 이전
                </button>
                <button type="submit" disabled={loading || uploading || !companyName}
                  className="flex-2 flex-grow-[2] bg-[#CAFF33] text-[#0a0a0a] py-3.5 rounded-xl font-black text-sm hover:brightness-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                  {loading
                    ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>처리 중...</>
                    : <><span className="material-symbols-outlined text-base">play_circle</span>14일 무료 시작</>
                  }
                </button>
              </div>
            </form>
          )}

          <p className="mt-5 text-center text-xs text-gray-400">
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
