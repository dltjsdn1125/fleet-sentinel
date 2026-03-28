import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── 실제 GPS 경로 좌표 (서울/수도권) ──────────────────────────────────────────
const ROUTES = [
  {
    start: "서울특별시 강남구 테헤란로 521",
    end: "경기도 수원시 팔달구 삼성로 129",
    startLat: 37.5066, startLng: 127.0546,
    endLat: 37.2635,   endLng: 127.0281,
    // 실제 경로 주요 웨이포인트 (서울 → 수원 고속화도로)
    waypoints: [
      [37.5066, 127.0546], [37.4944, 127.0562], [37.4801, 127.0489],
      [37.4620, 127.0410], [37.4392, 127.0358], [37.4109, 127.0303],
      [37.3826, 127.0275], [37.3541, 127.0268], [37.3242, 127.0273],
      [37.2945, 127.0276], [37.2635, 127.0281],
    ] as [number, number][],
  },
  {
    start: "서울특별시 마포구 상암동 DMC",
    end: "서울특별시 종로구 세종대로 172",
    startLat: 37.5755, startLng: 126.8930,
    endLat: 37.5716,   endLng: 126.9769,
    waypoints: [
      [37.5755, 126.8930], [37.5740, 126.9030], [37.5732, 126.9148],
      [37.5728, 126.9284], [37.5720, 126.9412], [37.5718, 126.9560],
      [37.5716, 126.9680], [37.5716, 126.9769],
    ] as [number, number][],
  },
  {
    start: "서울특별시 영등포구 여의도동",
    end: "인천광역시 중구 영종대로 271",
    startLat: 37.5217, startLng: 126.9240,
    endLat: 37.4479,   endLng: 126.5011,
    waypoints: [
      [37.5217, 126.9240], [37.5190, 126.9100], [37.5115, 126.8820],
      [37.5032, 126.8512], [37.4949, 126.8172], [37.4852, 126.7841],
      [37.4755, 126.7398], [37.4638, 126.6901], [37.4556, 126.6420],
      [37.4510, 126.5840], [37.4479, 126.5011],
    ] as [number, number][],
  },
  {
    start: "경기도 성남시 분당구 판교역로",
    end: "서울특별시 강남구 역삼동",
    startLat: 37.3946, startLng: 127.1108,
    endLat: 37.4999,   endLng: 127.0366,
    waypoints: [
      [37.3946, 127.1108], [37.4092, 127.1021], [37.4198, 127.0904],
      [37.4312, 127.0792], [37.4429, 127.0682], [37.4590, 127.0548],
      [37.4742, 127.0452], [37.4893, 127.0405], [37.4999, 127.0366],
    ] as [number, number][],
  },
];

// 웨이포인트 사이를 보간하여 촘촘한 GPS 포인트 생성
function generateGpsPoints(
  waypoints: [number, number][],
  intervalSeconds = 15,
  startTime: Date,
  speed = 60 // km/h 평균
): Array<{ lat: number; lng: number; accuracy: number; speed: number; heading: number; timestamp: Date }> {
  const points: Array<{ lat: number; lng: number; accuracy: number; speed: number; heading: number; timestamp: Date }> = [];
  let t = new Date(startTime);

  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lat1, lng1] = waypoints[i];
    const [lat2, lng2] = waypoints[i + 1];

    // 구간 거리 계산 (haversine 간소화)
    const dlat = lat2 - lat1;
    const dlng = lng2 - lng1;
    const distDeg = Math.sqrt(dlat * dlat + dlng * dlng);
    const distKm = distDeg * 111;

    // 이 구간에서 생성할 포인트 수
    const travelSec = (distKm / speed) * 3600;
    const numPoints = Math.max(2, Math.round(travelSec / intervalSeconds));

    for (let j = 0; j < numPoints; j++) {
      const frac = j / numPoints;
      const lat = lat1 + dlat * frac + (Math.random() - 0.5) * 0.0002;
      const lng = lng1 + dlng * frac + (Math.random() - 0.5) * 0.0002;
      const spd = speed * 1000 / 3600 * (0.8 + Math.random() * 0.4); // m/s
      const heading = Math.atan2(dlng, dlat) * (180 / Math.PI);

      points.push({
        lat: Math.round(lat * 1000000) / 1000000,
        lng: Math.round(lng * 1000000) / 1000000,
        accuracy: 8 + Math.random() * 15,
        speed: Math.round(spd * 10) / 10,
        heading: (heading + 360) % 360,
        timestamp: new Date(t),
      });

      t = new Date(t.getTime() + intervalSeconds * 1000);
    }
  }

  // 마지막 도착 포인트
  const last = waypoints[waypoints.length - 1];
  points.push({
    lat: last[0], lng: last[1],
    accuracy: 10,
    speed: 0,
    heading: 0,
    timestamp: new Date(t),
  });

  return points;
}

async function main() {
  console.log("🌱 시드 데이터 생성 시작...");

  // ─── 기존 데이터 정리 ─────────────────────────────────────────────────────
  await prisma.gpsPoint.deleteMany({});
  await prisma.trip.deleteMany({});

  // ─── 플랜 ─────────────────────────────────────────────────────────────────
  const starterPlan = await prisma.plan.upsert({
    where: { id: "plan_starter" },
    update: {},
    create: {
      id: "plan_starter",
      name: "STARTER",
      displayName: "Starter",
      priceMonthlyKrw: 49000,
      priceYearlyKrw: 470400,
      maxVehicles: 5,
      features: JSON.stringify([
        "차량 최대 5대",
        "GPS 자동 운행 감지",
        "운행일지 자동 생성",
        "국세청 엑셀 다운로드",
        "이메일 알림",
      ]),
    },
  });

  const businessPlan = await prisma.plan.upsert({
    where: { id: "plan_business" },
    update: {},
    create: {
      id: "plan_business",
      name: "BUSINESS",
      displayName: "Business",
      priceMonthlyKrw: 149000,
      priceYearlyKrw: 1430400,
      maxVehicles: 30,
      features: JSON.stringify([
        "차량 최대 30대",
        "Starter 모든 기능",
        "AI 운행 목적 자동 추천",
        "이상 운행 자동 감지",
        "공용 차량 예약 관리",
        "전자서명 확정",
        "부서별 통계 대시보드",
      ]),
    },
  });

  await prisma.plan.upsert({
    where: { id: "plan_enterprise" },
    update: {},
    create: {
      id: "plan_enterprise",
      name: "ENTERPRISE",
      displayName: "Enterprise",
      priceMonthlyKrw: 0,
      priceYearlyKrw: 0,
      maxVehicles: -1,
      features: JSON.stringify([
        "차량 무제한",
        "Business 모든 기능",
        "전담 세무사 연동",
        "ERP/회계 API 연동",
        "전용 SLA 99.9%",
        "보안 감사 리포트",
        "맞춤형 온보딩",
      ]),
    },
  });

  // ─── 데모 회사 ────────────────────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { id: "demo_company" },
    update: {},
    create: {
      id: "demo_company",
      name: "(주) 데모기업",
      bizNumber: "123-45-67890",
      subscriptionStatus: "TRIAL",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      planId: businessPlan.id,
    },
  });

  // ─── 사용자 ───────────────────────────────────────────────────────────────
  const adminPw  = await bcrypt.hash("demo1234", 12);
  const driverPw = await bcrypt.hash("demo1234", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: { email: "admin@demo.com", password: adminPw, name: "Alex Sterling", role: "ADMIN", companyId: company.id },
  });

  const driver1 = await prisma.user.upsert({
    where: { email: "driver@demo.com" },
    update: {},
    create: { email: "driver@demo.com", password: driverPw, name: "Marco Rossi", role: "EMPLOYEE", companyId: company.id },
  });

  const driver2 = await prisma.user.upsert({
    where: { email: "sarah@demo.com" },
    update: {},
    create: { email: "sarah@demo.com", password: driverPw, name: "Sarah Jenkins", role: "EMPLOYEE", companyId: company.id },
  });

  const driver3 = await prisma.user.upsert({
    where: { email: "lars@demo.com" },
    update: {},
    create: { email: "lars@demo.com", password: driverPw, name: "Lars Müller", role: "EMPLOYEE", companyId: company.id },
  });

  // ─── 차량 ─────────────────────────────────────────────────────────────────
  const v1 = await prisma.vehicle.upsert({
    where: { licensePlate: "12가3456" },
    update: {},
    create: { licensePlate: "12가3456", make: "Mercedes", model: "Sprinter", year: 2023, type: "VAN",   fuelType: "DIESEL",   odometer: 32400, companyId: company.id, assignedDriverId: driver1.id },
  });
  const v2 = await prisma.vehicle.upsert({
    where: { licensePlate: "34나7890" },
    update: {},
    create: { licensePlate: "34나7890", make: "Volkswagen", model: "ID.4",    year: 2024, type: "SUV",   fuelType: "ELECTRIC", odometer:  8200, companyId: company.id, assignedDriverId: driver2.id },
  });
  const v3 = await prisma.vehicle.upsert({
    where: { licensePlate: "56다0123" },
    update: {},
    create: { licensePlate: "56다0123", make: "Ford", model: "Transit",       year: 2022, type: "VAN",   fuelType: "DIESEL",   odometer: 45892, companyId: company.id, assignedDriverId: driver3.id },
  });
  await prisma.vehicle.upsert({
    where: { licensePlate: "78라4567" },
    update: {},
    create: { licensePlate: "78라4567", make: "Tesla", model: "Model 3",      year: 2024, type: "SEDAN", fuelType: "ELECTRIC", odometer: 12450, companyId: company.id },
  });

  const drivers     = [driver1, driver2, driver3];
  const vehicleMap  = [v1, v2, v3];
  const purposeCodes = ["CLIENT_VISIT", "DELIVERY", "MEETING", "COMMUTE"];
  const purposeTexts: Record<string, string> = {
    CLIENT_VISIT: "고객사 방문",
    DELIVERY:     "납품 배송",
    MEETING:      "외부 회의",
    COMMUTE:      "출퇴근",
  };

  // ─── 운행 기록 30건 (GPS 포인트 포함) ─────────────────────────────────────
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);

    const driverIdx = i % 3;
    const routeIdx  = i % 4;
    const pcIdx     = i % 4;
    const route     = ROUTES[routeIdx];

    const startH = 8 + Math.floor(Math.random() * 3);
    const startTime = new Date(d);
    startTime.setHours(startH, Math.floor(Math.random() * 60), 0, 0);

    // 실제 GPS 포인트 생성
    const speed = 50 + Math.random() * 40;
    const gpsPoints = generateGpsPoints(route.waypoints, 12, startTime, speed);

    const durationMs = gpsPoints.length * 12 * 1000;
    const endTime = new Date(startTime.getTime() + durationMs);

    // 거리 계산 (웨이포인트 기반 추정)
    let distKm = 0;
    for (let w = 0; w < route.waypoints.length - 1; w++) {
      const [la1, lo1] = route.waypoints[w];
      const [la2, lo2] = route.waypoints[w + 1];
      distKm += Math.sqrt(Math.pow((la2 - la1) * 111, 2) + Math.pow((lo2 - lo1) * 88, 2));
    }

    const noP = i < 8 && Math.random() > 0.6;

    const trip = await prisma.trip.create({
      data: {
        date:         d,
        startTime,
        endTime,
        startAddress: route.start,
        endAddress:   route.end,
        startLat:     route.startLat,
        startLng:     route.startLng,
        endLat:       route.endLat,
        endLng:       route.endLng,
        distanceKm:   Math.round(distKm * 10) / 10,
        purpose:      noP ? null : purposeTexts[purposeCodes[pcIdx]],
        purposeCode:  noP ? null : purposeCodes[pcIdx],
        status:       noP ? "COMPLETED" : "COMPLETED",
        driverId:     drivers[driverIdx].id,
        vehicleId:    vehicleMap[driverIdx].id,
        gpsPoints: {
          createMany: {
            data: gpsPoints.map((pt) => ({
              lat:       pt.lat,
              lng:       pt.lng,
              accuracy:  pt.accuracy,
              speed:     pt.speed,
              heading:   pt.heading,
              timestamp: pt.timestamp,
            })),
          },
        },
      },
    });

    process.stdout.write(`  ✓ 운행 ${i + 1}/30 (${gpsPoints.length}개 GPS 포인트)\r`);
  }
  console.log("\n");

  // ─── 이상 운행 샘플 (새벽 부산 운행) ──────────────────────────────────────
  const anomalyStart = new Date();
  anomalyStart.setHours(3, 15, 0, 0);

  // 서울 → 부산 고속도로 주요 웨이포인트
  const seoulToBusan: [number, number][] = [
    [37.5400, 126.9900], [37.4500, 127.1200], [37.3200, 127.2800],
    [37.1800, 127.4500], [36.9900, 127.6800], [36.7200, 127.9200],
    [36.4500, 128.1800], [36.1200, 128.3900], [35.8700, 128.5900],
    [35.6900, 128.8200], [35.5500, 129.0800], [35.4200, 129.1800],
    [35.1800, 129.0800],
  ];

  const anomalyGpsPoints = generateGpsPoints(seoulToBusan, 30, anomalyStart, 110);

  await prisma.trip.create({
    data: {
      date:         new Date(),
      startTime:    anomalyStart,
      endTime:      new Date(anomalyStart.getTime() + anomalyGpsPoints.length * 30 * 1000),
      startAddress: "서울특별시 용산구 한강대로",
      endAddress:   "부산광역시 해운대구 해운대해변로",
      startLat:     37.5400,
      startLng:     126.9900,
      endLat:       35.1800,
      endLng:       129.0800,
      distanceKm:   420,
      purpose:      null,
      status:       "FLAGGED",
      flagReason:   "새벽 운행 감지 (3시)",
      driverId:     driver1.id,
      vehicleId:    v1.id,
      gpsPoints: {
        createMany: {
          data: anomalyGpsPoints.map((pt) => ({
            lat: pt.lat, lng: pt.lng,
            accuracy: pt.accuracy, speed: pt.speed,
            heading: pt.heading, timestamp: pt.timestamp,
          })),
        },
      },
    },
  });

  console.log("✅ 시드 데이터 생성 완료");
  console.log("─────────────────────────────────");
  console.log("관리자 : admin@demo.com / demo1234");
  console.log("직원   : driver@demo.com / demo1234");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
