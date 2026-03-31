"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { PLANS } from "@/lib/plans";

/* ── 자동 스크롤 로고 트랙 ── */
function LogoTrack({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
  return (
    <div className="overflow-hidden relative">
      <div
        className={`flex gap-10 w-max ${reverse ? "animate-scroll-right" : "animate-scroll-left"}`}
        style={{ animation: `${reverse ? "scrollRight" : "scrollLeft"} 35s linear infinite` }}
      >
        {[...items, ...items].map((item, i) => (
          <span key={i} className="text-xs font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap px-4 py-2 border border-gray-100 rounded-full">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState("");

  const companies = [
    "삼성전자", "LG전자", "현대자동차", "SK하이닉스", "롯데그룹",
    "CJ제일제당", "한화그룹", "GS칼텍스", "두산중공업", "코웨이",
    "신세계", "카카오", "네이버", "KT", "포스코",
  ];

  return (
    <div className="bg-white text-[#0a0a0a] antialiased" style={{ fontFamily: "'Gowun Dodum', sans-serif" }}>

      {/* ── 상단 공지 바 ── */}
      <div className="bg-[#0a0a0a] text-white text-center py-2.5 px-4 text-xs font-medium flex items-center justify-center gap-2">
        <span className="text-lime">✦</span>
        국세청 업무용 차량 운행일지 2026년 개정 서식 반영 완료
        <Link href="/register" className="underline underline-offset-2 hover:text-lime transition-colors">무료로 시작하기 →</Link>
      </div>

      {/* ── 네비게이션 ── */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 h-14 flex items-center justify-between px-5 md:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 font-black text-base tracking-tight">
            <span className="w-7 h-7 bg-[#0a0a0a] rounded-lg flex items-center justify-center">
              <span className="text-lime text-xs font-black">FS</span>
            </span>
            FleetSentinel
          </Link>
          <div className="hidden md:flex gap-6 text-sm font-medium text-gray-500">
            <a href="#features" className="hover:text-[#0a0a0a] transition-colors">기능</a>
            <a href="#compliance" className="hover:text-[#0a0a0a] transition-colors">준법관리</a>
            <a href="#pricing" className="hover:text-[#0a0a0a] transition-colors">요금제</a>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-[#0a0a0a] transition-colors px-3 py-2">
            로그인
          </Link>
          <Link href="/register" className="bg-lime text-[#0a0a0a] font-bold text-sm px-5 py-2 rounded-full hover:bg-lime-dark transition-colors">
            무료 체험
          </Link>
        </div>
        <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
          <div className="w-5 h-0.5 bg-[#0a0a0a] mb-1.5 transition-all" style={{ transform: menuOpen ? "rotate(45deg) translate(2px, 2px)" : "" }}></div>
          <div className="w-5 h-0.5 bg-[#0a0a0a] transition-all" style={{ opacity: menuOpen ? 0 : 1 }}></div>
          <div className="w-5 h-0.5 bg-[#0a0a0a] mt-1.5 transition-all" style={{ transform: menuOpen ? "rotate(-45deg) translate(2px, -2px)" : "" }}></div>
        </button>
      </nav>

      {/* 모바일 메뉴 */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-white pt-14">
          <div className="flex flex-col p-6 gap-2">
            {["기능#features", "준법관리#compliance", "요금제#pricing"].map((item) => {
              const [label, href] = item.split("#");
              return (
                <a key={label} href={`#${href}`} onClick={() => setMenuOpen(false)}
                  className="text-2xl font-bold py-3 border-b border-gray-100">
                  {label}
                </a>
              );
            })}
            <div className="pt-6 flex flex-col gap-3">
              <Link href="/login" className="text-center py-3.5 border border-gray-200 rounded-full font-semibold" onClick={() => setMenuOpen(false)}>로그인</Link>
              <Link href="/register" className="text-center py-3.5 bg-lime rounded-full font-bold" onClick={() => setMenuOpen(false)}>무료 체험 시작</Link>
            </div>
          </div>
        </div>
      )}

      <main>
        {/* ── 히어로 섹션 ── */}
        <section className="min-h-[88vh] flex flex-col items-center justify-center px-4 py-20 text-center bg-white">
          <div className="w-full max-w-5xl mx-auto">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-xs font-semibold text-gray-500 mb-8">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime"></span>
              GPS 실시간 추적 · 국세청 준수
            </span>

            <h1 className="mb-6 text-[#0a0a0a]">
              <span className="block font-black text-[clamp(2.4rem,7vw,4.75rem)] leading-[1.08] tracking-tight">
                법인 차량 운행일지
              </span>
              <span className="mt-3 block text-[clamp(1.15rem,2.8vw,1.875rem)] font-bold leading-snug tracking-tight text-gray-600">
                GPS 로그 기반 자동 기록 · 집계 ·{" "}
                <span className="text-[#0a0a0a]">국세청 서식 출력</span>
              </span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg font-medium leading-relaxed text-gray-500 md:text-xl">
              운행 구간은 브라우저 GPS로 남기고, 월말에는 법인세 시행규칙 별지 서식에 맞춘 엑셀을 바로 받으세요.
              <br className="hidden md:block" />
              입력·정리 시간을 줄이고 감사·세무 대응에 집중할 수 있습니다.
            </p>

            {/* 이메일 입력 CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-5">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
                className="w-full sm:flex-1 px-5 py-3.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-[#0a0a0a] transition-colors"
              />
              <Link
                href={`/register${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                className="w-full sm:w-auto bg-lime text-[#0a0a0a] font-bold text-sm px-6 py-3.5 rounded-full hover:bg-lime-dark transition-colors whitespace-nowrap"
              >
                무료로 시작하기
              </Link>
            </div>
            <p className="text-xs text-gray-400">신용카드 불필요 · 14일 전체 기능 무료</p>

            {/* 히어로 목업 */}
            <div className="mt-14 relative max-w-4xl mx-auto">
              {/* 메인 대시보드 */}
              <div className="bg-[#0a0a0a] rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
                {/* 상단 바 */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
                  <div className="h-3 w-3 rounded-full bg-gray-600"></div>
                  <div className="h-3 w-3 rounded-full bg-gray-500"></div>
                  <div className="h-3 w-3 rounded-full bg-lime/80"></div>
                  <span className="mx-auto text-xs text-gray-500">fleet-sentinel · 대시보드</span>
                </div>
                <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "총 차량", value: "35대", color: "text-white" },
                    { label: "오늘 운행", value: "12건", color: "text-lime" },
                    { label: "목적 미입력", value: "3건", color: "text-lime" },
                    { label: "이번달 거리", value: "1,240km", color: "text-white" },
                  ].map((c) => (
                    <div key={c.label} className="bg-white/5 rounded-xl p-4">
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-2">{c.label}</p>
                      <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
                    </div>
                  ))}
                </div>
                {/* GPS 실시간 */}
                <div className="mx-5 mb-5 bg-lime/10 border border-lime/30 rounded-xl p-4 flex items-center gap-3">
                  <span className="w-2 h-2 bg-lime rounded-full animate-pulse shrink-0"></span>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[9px] text-lime uppercase tracking-widest font-bold">실시간 GPS 추적 중</p>
                    <p className="text-sm font-bold text-white truncate mt-0.5">서울 강남구 → 경기 수원시 (38.2km · 42분)</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-gray-500">정확도</p>
                    <p className="text-sm font-bold text-lime">±12m</p>
                  </div>
                </div>
                {/* 운행 목록 */}
                <div className="mx-5 mb-5 space-y-2">
                  {[
                    { time: "09:14", from: "본사", to: "거래처 A", km: "18.3km", status: "완료" },
                    { time: "11:32", from: "거래처 A", to: "공장", km: "31.7km", status: "검토" },
                    { time: "14:05", from: "공장", to: "본사", km: "29.4km", status: "완료" },
                  ].map((trip, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3">
                      <span className="text-xs text-gray-500 font-mono w-10">{trip.time}</span>
                      <span className="text-xs text-gray-300 flex-1">{trip.from} → {trip.to}</span>
                      <span className="text-xs text-gray-400">{trip.km}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          trip.status === "완료"
                            ? "bg-lime/20 text-lime"
                            : "bg-gray-600/40 text-gray-200"
                        }`}
                      >
                        {trip.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 부유 카드 - 좌 */}
              <div className="hidden md:block absolute -left-12 top-12 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-48">
                <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-2">엑셀 생성 완료</p>
                <p className="text-sm font-bold text-[#0a0a0a]">2026년 2월</p>
                <p className="text-xs text-gray-500 mt-0.5">운행일지 47건</p>
                <div className="mt-3 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-lime"></div>
                  <span className="text-[10px] text-gray-400">국세청 제출 가능</span>
                </div>
              </div>

              {/* 부유 카드 - 우 */}
              <div className="hidden md:block absolute -right-10 top-8 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-44">
                <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-2">이상 감지</p>
                <p className="text-sm font-bold text-[#0a0a0a]">새벽 운행 감지</p>
                <p className="text-xs text-gray-500 mt-0.5">AM 3:14 · 420km</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full w-2/3 rounded-full bg-lime"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 회사 로고 스크롤 ── */}
        <section className="py-10 border-y border-gray-100 overflow-hidden px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20">
          <div className="mx-auto w-[70%] max-w-full min-w-0">
            <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">
              국내 주요 법인이 사용 중인 FleetSentinel
            </p>
            <LogoTrack items={companies} />
            <div className="mt-4">
              <LogoTrack items={[...companies].reverse()} reverse />
            </div>
          </div>
        </section>

        {/* ── 기능 배너 1: GPS 자동화 ── */}
        <section id="compliance" className="py-20 md:py-28 bg-[#0a0a0a] px-4 md:px-8 overflow-hidden">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block text-xs font-bold text-lime uppercase tracking-widest mb-6 border border-lime/30 px-3 py-1 rounded-full">
                GPS 추적 기술
              </span>
              <h2 className="font-black text-[clamp(2rem,4vw,3.2rem)] leading-tight text-white mb-6">
                기록, 자동화됨
              </h2>
              <p className="text-gray-400 text-base leading-relaxed mb-8">
                브라우저 GPS로 출발을 감지하는 순간부터 목적지 도착까지 전 구간 자동 기록됩니다. Kalman Filter로 노이즈를 제거하고, 10초마다 서버에 배치 업로드.
              </p>
              <div className="space-y-3 mb-10">
                {["정확도 50m 이내 필터링", "속도 기반 물리적 점프 감지 제거", "GPS 음영지역 수동입력 보완", "10초 배치 업로드로 배터리 최적화"].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-lime/20 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lime" style={{ fontSize: "12px" }}>check</span>
                    </div>
                    <span className="text-sm text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Link href="/register" className="bg-lime text-[#0a0a0a] font-bold text-sm px-6 py-3 rounded-full hover:bg-lime-dark transition-colors">
                  무료로 시작하기
                </Link>
                <Link href="#" className="border border-gray-700 text-white font-semibold text-sm px-6 py-3 rounded-full hover:border-gray-500 transition-colors">
                  데모 보기
                </Link>
              </div>
            </div>
            {/* GPS 애니메이션 목업 */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2 h-2 bg-lime rounded-full animate-pulse"></div>
                  <span className="text-xs text-lime font-bold uppercase tracking-widest">실시간 추적 중</span>
                </div>
                {[
                  { time: "09:14:32", lat: "37.5048", lng: "127.0240", acc: "±8m", speed: "42 km/h" },
                  { time: "09:14:42", lat: "37.5061", lng: "127.0258", acc: "±12m", speed: "38 km/h" },
                  { time: "09:14:52", lat: "37.5075", lng: "127.0271", acc: "±9m", speed: "45 km/h" },
                  { time: "09:15:02", lat: "37.5089", lng: "127.0285", acc: "±11m", speed: "40 km/h" },
                ].map((point, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${i === 3 ? "bg-lime/10 border border-lime/30" : "bg-white/5"}`}>
                    <span className="text-[10px] font-mono text-gray-500 w-16">{point.time}</span>
                    <div className="flex-1">
                      <span className="text-xs font-mono text-gray-300">{point.lat}, {point.lng}</span>
                    </div>
                    <span className="text-[10px] text-lime">{point.acc}</span>
                    <span className="text-[10px] text-gray-500">{point.speed}</span>
                  </div>
                ))}
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-xs">
                  <span className="text-gray-500">누적 거리</span>
                  <span className="text-lime font-bold">14.3 km</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 기능 배너 2: 국세청 보고서 ── */}
        <section className="py-20 md:py-28 px-4 md:px-8">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            {/* 엑셀 미리보기 */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 overflow-hidden">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 bg-[#0a0a0a] px-4 py-3">
                  <span className="text-xs font-bold text-lime">업무용 차량 운행일지.xlsx</span>
                  <span className="ml-auto text-[10px] text-gray-400">국세청 법인세법 시행규칙 별지 제66호</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[9px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {["날짜", "차량번호", "운전자", "출발지", "도착지", "거리(km)", "목적"].map((h) => (
                          <th key={h} className="px-2 py-2 text-left font-bold text-gray-600 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["03/01", "12가3456", "김철수", "본사", "거래처", "18.3", "영업방문"],
                        ["03/01", "78나9012", "이영희", "공장", "본사", "31.7", "출장"],
                        ["03/02", "12가3456", "김철수", "본사", "거래처", "22.1", "미팅"],
                        ["03/02", "34다5678", "박민수", "본사", "고객사", "15.8", "영업방문"],
                      ].map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          {row.map((cell, j) => (
                            <td key={j} className="px-2 py-2 text-gray-700 whitespace-nowrap">{cell}</td>
                          ))}
                        </tr>
                      ))}
                      <tr className="bg-lime/10 font-bold">
                        <td colSpan={5} className="px-2 py-2 text-xs text-gray-800">
                          합계
                        </td>
                        <td className="px-2 py-2 text-xs text-[#0a0a0a]">87.9</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>총 47건 운행 기록</span>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg bg-lime px-3 py-1.5 font-semibold text-[#0a0a0a] transition-colors hover:bg-lime-dark"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>download</span>
                  엑셀 다운로드
                </button>
              </div>
            </div>
            <div>
              <span className="inline-block text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 border border-gray-200 px-3 py-1 rounded-full">
                국세청 준수 보고서
              </span>
              <h2 className="font-black text-[clamp(2rem,4vw,3.2rem)] leading-tight mb-6">
                보고서, 즉시 생성
              </h2>
              <p className="text-gray-500 text-base leading-relaxed mb-8">
                법인세법 시행규칙 별지 제66호 서식을 완벽히 준수하는 엑셀을 클릭 한 번에 생성. 세무사에게 바로 전달 가능합니다.
              </p>
              <div className="space-y-4 mb-10">
                {[
                  { num: "01", text: "GPS 자동 수집 → 운행 완료 후 목적 입력" },
                  { num: "02", text: "한 달치 운행 데이터 자동 집계" },
                  { num: "03", text: "국세청 양식 엑셀 즉시 다운로드" },
                ].map((step) => (
                  <div key={step.num} className="flex gap-4 items-start">
                    <span className="font-black text-2xl text-gray-100 w-10 shrink-0">{step.num}</span>
                    <p className="text-sm text-gray-600 pt-1.5 leading-relaxed">{step.text}</p>
                  </div>
                ))}
              </div>
              <Link href="/register" className="inline-flex items-center gap-2 bg-lime text-[#0a0a0a] font-bold text-sm px-6 py-3 rounded-full hover:bg-lime-dark transition-colors">
                무료로 시작하기
              </Link>
            </div>
          </div>
        </section>

        {/* ── 기능 배너 3: 이상 감지 (검정·회색·라임만) ── */}
        <section className="py-20 md:py-28 bg-gray-50 px-4 md:px-8">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block text-xs font-bold text-[#0a0a0a] uppercase tracking-widest mb-6 border border-lime/40 px-3 py-1 rounded-full bg-lime/15">
                자동 이상 감지
              </span>
              <h2 className="font-black text-[clamp(2rem,4vw,3.2rem)] leading-tight mb-6 text-[#0a0a0a]">
                리스크, 자동 감지
              </h2>
              <p className="text-gray-500 text-base leading-relaxed mb-8">
                세무조사에서 문제가 될 수 있는 이상 운행을 AI가 자동으로 감지하고 알립니다. 새벽 운행, 장거리 단일 운행, 목적 미기재를 놓치지 않습니다.
              </p>
              <div className="space-y-3 mb-10">
                {[
                  { label: "새벽 운행 (오전 2~5시)", severity: "high" },
                  { label: "단일 운행 500km 초과", severity: "high" },
                  { label: "24시간 내 목적 미기재", severity: "medium" },
                  { label: "동일 목적지 반복 이상 패턴", severity: "low" },
                ].map((alert) => (
                  <div
                    key={alert.label}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      alert.severity === "high"
                        ? "bg-lime/10 border-lime/30"
                        : alert.severity === "medium"
                          ? "bg-gray-200/70 border-gray-300"
                          : "bg-gray-100 border-gray-200"
                    }`}
                  >
                    <div
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        alert.severity === "high"
                          ? "bg-lime"
                          : alert.severity === "medium"
                            ? "bg-gray-500"
                            : "bg-gray-400"
                      }`}
                    />
                    <span className="text-sm text-gray-800">{alert.label}</span>
                    <span
                      className={`ml-auto text-[10px] font-bold uppercase ${
                        alert.severity === "high"
                          ? "text-[#0a0a0a]"
                          : alert.severity === "medium"
                            ? "text-gray-600"
                            : "text-gray-400"
                      }`}
                    >
                      {alert.severity === "high" ? "위험" : alert.severity === "medium" ? "주의" : "낮음"}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-[#0a0a0a] px-6 py-3 text-sm font-bold text-lime transition-colors hover:bg-gray-800"
              >
                무료로 시작하기
              </Link>
            </div>
            {/* 이상 감지 카드 */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-lime/20">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-lime">이상 감지</p>
                    <p className="mt-1 text-sm font-bold text-[#0a0a0a]">새벽 운행 감지됨</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] text-gray-500">2026-03-15</span>
                </div>
                <p className="text-xs text-gray-500">AM 3:14 출발 · 420km · 목적: 미입력</p>
                <p className="mt-1 text-xs text-gray-500">차량: 12가3456 · 운전자: 박민수</p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-lime py-2 text-xs font-semibold text-[#0a0a0a] transition-colors hover:bg-lime-dark"
                  >
                    검토 요청
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    목적 입력
                  </button>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">주의</p>
                    <p className="mt-1 text-sm font-bold text-[#0a0a0a]">목적 미입력 3건</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] text-gray-500">24시간 경과</span>
                </div>
                <p className="text-xs text-gray-500">국세청 제출 전 목적 입력이 필요합니다.</p>
                <div className="mt-4">
                  <button
                    type="button"
                    className="w-full rounded-lg border border-gray-300 bg-gray-900 py-2 text-xs font-semibold text-lime transition-colors hover:bg-gray-800"
                  >
                    일괄 입력하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 소셜 프루프 ── */}
        <section className="py-20 md:py-28 px-4 md:px-8">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-gray-400 text-sm font-medium mb-3">전국 법인이 신뢰하는 FleetSentinel</p>
            <h2 className="font-black text-[clamp(2.5rem,6vw,4.5rem)] leading-tight tracking-tight mb-6">
              5,000개 이상의<br />기업이 사용 중
            </h2>
            <p className="text-gray-500 text-lg mb-16">매월 50,000건 이상의 운행 기록 자동 생성</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {[
                { value: "99%", label: "수동 작성 절감", desc: "GPS 자동화" },
                { value: "50m↓", label: "GPS 정확도", desc: "Kalman Filter" },
                { value: "즉시", label: "국세청 양식", desc: "엑셀 자동 생성" },
                { value: "0건", label: "세무 리스크", desc: "이상 감지 AI" },
              ].map((s) => (
                <div key={s.label} className="text-center p-6 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="font-black text-3xl md:text-4xl mb-1">{s.value}</div>
                  <div className="text-sm font-bold text-gray-700 mb-0.5">{s.label}</div>
                  <div className="text-xs text-gray-400">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 요금제 ── */}
        <section id="pricing" className="py-20 md:py-28 bg-[#0a0a0a] px-4 md:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-black text-[clamp(2rem,5vw,3.5rem)] text-white leading-tight tracking-tight mb-4">요금제</h2>
              <p className="text-gray-400">차량 수 기준 구독 · 연간 결제 시 20% 할인</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {Object.values(PLANS).map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-2xl p-8 flex flex-col relative ${
                    plan.name === "BUSINESS"
                      ? "bg-lime"
                      : "bg-white/5 border border-white/10"
                  }`}
                >
                  {plan.name === "BUSINESS" && (
                    <span className="absolute top-4 right-4 bg-[#0a0a0a] text-lime text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full">추천</span>
                  )}
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-4 ${plan.name === "BUSINESS" ? "text-[#0a0a0a]/60" : "text-gray-500"}`}>
                    {plan.displayName}
                  </p>
                  <div className="mb-6">
                    {plan.priceMonthlyKrw === 0 ? (
                      <div className={`text-4xl font-black ${plan.name === "BUSINESS" ? "text-[#0a0a0a]" : "text-white"}`}>협의</div>
                    ) : (
                      <>
                        <div className={`text-4xl font-black ${plan.name === "BUSINESS" ? "text-[#0a0a0a]" : "text-white"}`}>
                          {plan.priceMonthlyKrw.toLocaleString()}원
                        </div>
                        <div className={`text-xs mt-1 ${plan.name === "BUSINESS" ? "text-[#0a0a0a]/60" : "text-gray-500"}`}>
                          /월 · 연간 {plan.priceYearlyKrw.toLocaleString()}원
                        </div>
                      </>
                    )}
                    <div className={`text-sm mt-2 font-bold ${plan.name === "BUSINESS" ? "text-[#0a0a0a]" : "text-gray-300"}`}>
                      차량 {plan.maxVehicles === -1 ? "무제한" : `최대 ${plan.maxVehicles}대`}
                    </div>
                  </div>
                  <ul className="space-y-2.5 flex-1 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <span className={`shrink-0 font-bold mt-0.5 ${plan.name === "BUSINESS" ? "text-[#0a0a0a]" : "text-lime"}`}>✓</span>
                        <span className={plan.name === "BUSINESS" ? "text-[#0a0a0a]" : "text-gray-300"}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/register?plan=${plan.name.toLowerCase()}`}
                    className={`w-full py-3.5 rounded-full font-bold text-sm text-center transition-all ${
                      plan.name === "BUSINESS"
                        ? "bg-[#0a0a0a] text-lime hover:bg-gray-900"
                        : "bg-lime text-[#0a0a0a] hover:bg-lime-dark"
                    }`}
                  >
                    {plan.priceMonthlyKrw === 0 ? "영업팀 문의" : "14일 무료 시작"}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 최종 CTA ── */}
        <section className="py-24 md:py-32 px-4 md:px-8 text-center bg-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-black text-[clamp(2.5rem,6vw,4rem)] leading-tight tracking-tight mb-6">
              지금 바로<br />14일 무료 체험
            </h2>
            <p className="text-gray-500 text-lg mb-10">신용카드 불필요. 지금 가입하면 모든 기능을 14일간 무료로 사용하실 수 있습니다.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-5">
              <input
                type="email"
                placeholder="이메일을 입력하세요"
                className="w-full sm:flex-1 px-5 py-3.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-[#0a0a0a] transition-colors"
              />
              <Link href="/register" className="w-full sm:w-auto bg-lime text-[#0a0a0a] font-bold text-sm px-6 py-3.5 rounded-full hover:bg-lime-dark transition-colors whitespace-nowrap">
                무료로 시작하기
              </Link>
            </div>
            <p className="text-xs text-gray-400">5,000개 이상의 법인이 신뢰하는 FleetSentinel</p>
          </div>
        </section>
      </main>

      {/* ── 푸터 ── */}
      <footer className="bg-[#0a0a0a] text-white py-16 md:py-20 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12 mb-12 md:mb-16">
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-2.5 font-black text-base mb-4">
                <span className="w-7 h-7 bg-lime rounded-lg flex items-center justify-center">
                  <span className="text-[#0a0a0a] text-xs font-black">FS</span>
                </span>
                FleetSentinel
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                법인 차량 운행일지 자동화와 국세청 업무용 차량 운행일지 서식 지원.
              </p>
            </div>
            {[
              { title: "제품", links: ["기능", "요금제", "보안", "API"] },
              { title: "법적 정보", links: ["개인정보처리방침", "이용약관", "위치정보 이용약관"] },
              { title: "고객지원", links: ["도움말", "세무사 가이드", "영업 문의"] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">{col.title}</p>
                <ul className="space-y-3">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="text-xs text-gray-600">© 2026 FleetSentinel. All rights reserved.</p>
            <div className="flex gap-5 text-[10px] font-bold text-gray-600 uppercase tracking-wider">
              <span>국세청 운행일지 서식 준수</span>
              <span>개인정보보호법 준수</span>
            </div>
          </div>
        </div>
      </footer>

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes scrollLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scrollRight {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
