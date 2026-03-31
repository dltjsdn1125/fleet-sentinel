"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const INDUSTRIES = [
  "제조업", "건설업", "도소매업", "운수·창고업", "정보통신업",
  "금융·보험업", "부동산업", "전문·과학·기술 서비스업",
  "사업시설 관리·지원 서비스업", "교육 서비스업", "보건·사회복지 서비스업",
  "예술·스포츠·여가 서비스업", "기타 서비스업",
];

function formatBizNumber(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();

  const [companyName, setCompanyName] = useState("");
  const [bizNumber, setBizNumber] = useState("");
  const [ceoName, setCeoName] = useState("");
  const [industry, setIndustry] = useState("");
  const [bizDocFile, setBizDocFile] = useState<File | null>(null);
  const [bizDocUrl, setBizDocUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBizDocFile(file);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/biz-doc", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setBizDocUrl(data.url);
      else { setError(data.error ?? "파일 업로드 실패"); setBizDocFile(null); }
    } catch {
      setError("파일 업로드 중 오류가 발생했습니다.");
      setBizDocFile(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName) { setError("회사명을 입력해주세요."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, bizNumber, ceoName, industry, bizDocUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "오류가 발생했습니다."); return; }

      // 세션 갱신 후 대시보드로
      await update();
      router.push("/dashboard");
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-extrabold tracking-tight uppercase">FleetSentinel</Link>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">기업 정보 등록</p>
        </div>

        {/* 환영 메시지 */}
        <div className="bg-[#0a0a0a] text-white rounded-xl p-5 mb-5 flex items-center gap-4">
          {session?.user?.image ? (
            <img src={session.user.image} alt="" className="w-12 h-12 rounded-xl border-2 border-white/20 object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">person</span>
            </div>
          )}
          <div>
            <p className="font-black text-base">{session?.user?.name ?? "사용자"}님, 환영합니다!</p>
            <p className="text-xs text-gray-400 mt-0.5">소셜 계정 연동 완료 · 기업 정보를 입력하면 서비스를 시작합니다</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h1 className="text-xl font-extrabold mb-1">기업 정보 입력</h1>
          <p className="text-gray-400 text-sm mb-6">법인차량 관리를 위한 사업자 정보를 입력해주세요</p>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">사업자등록번호</label>
              <input value={bizNumber} onChange={(e) => setBizNumber(formatBizNumber(e.target.value))}
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
                  bizDocFile ? "border-[#CAFF33] bg-[#CAFF33]/10" : "border-gray-200 hover:border-gray-300 bg-gray-50"
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
                    <span className="text-sm font-bold truncate max-w-[200px]">{bizDocFile.name}</span>
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); setBizDocFile(null); setBizDocUrl(""); }}
                      className="text-gray-400 hover:text-red-500">
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <span className="material-symbols-outlined text-2xl text-gray-300">upload_file</span>
                    <p className="text-sm text-gray-500">클릭하여 파일 선택</p>
                    <p className="text-xs text-gray-400">첨부 시 빠른 사업자 인증이 가능합니다</p>
                  </div>
                )}
              </div>
            </div>

            {/* 안내 배너 */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
              <span className="material-symbols-outlined text-blue-400 text-lg shrink-0 mt-0.5">info</span>
              <div className="text-xs text-blue-700">
                <p className="font-bold mb-0.5">사업자등록증 첨부 시 혜택</p>
                <p>• 빠른 계정 인증 및 세금계산서 발행</p>
                <p>• 국세청 법인차량 운행일지 자동 서식 적용</p>
                <p>• 첨부하지 않아도 서비스 이용은 가능합니다</p>
              </div>
            </div>

            <button type="submit" disabled={loading || uploading}
              className="w-full bg-[#CAFF33] text-[#0a0a0a] py-3.5 rounded-xl font-black text-sm hover:brightness-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
              {loading
                ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>처리 중...</>
                : <><span className="material-symbols-outlined text-base">rocket_launch</span>서비스 시작하기</>
              }
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          나중에 입력하려면{" "}
          <button onClick={() => router.push("/dashboard")} className="underline font-bold text-gray-600">
            건너뛰기
          </button>
        </p>
      </div>
    </div>
  );
}
