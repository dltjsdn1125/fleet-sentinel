/** 요금제 정의 (Stripe SDK와 분리 — 랜딩/회원가입 등에서 안전하게 import) */
export const PLANS = {
  STARTER: {
    name: "STARTER",
    displayName: "Starter",
    priceMonthlyKrw: 49000,
    priceYearlyKrw: 470400,
    maxVehicles: 5,
    features: [
      "차량 최대 5대",
      "GPS 자동 운행 감지",
      "운행일지 자동 생성",
      "국세청 엑셀 다운로드",
      "이메일 알림",
    ],
  },
  BUSINESS: {
    name: "BUSINESS",
    displayName: "Business",
    priceMonthlyKrw: 149000,
    priceYearlyKrw: 1430400,
    maxVehicles: 30,
    features: [
      "차량 최대 30대",
      "Starter 모든 기능",
      "AI 운행 목적 자동 추천",
      "이상 운행 자동 감지",
      "공용 차량 예약 관리",
      "전자서명 확정",
      "부서별 통계 대시보드",
    ],
  },
  ENTERPRISE: {
    name: "ENTERPRISE",
    displayName: "Enterprise",
    priceMonthlyKrw: 0,
    priceYearlyKrw: 0,
    maxVehicles: -1,
    features: [
      "차량 무제한",
      "Business 모든 기능",
      "전담 세무사 연동",
      "ERP/회계 API 연동",
      "전용 SLA 99.9%",
      "보안 감사 리포트",
      "맞춤형 온보딩",
    ],
  },
};
