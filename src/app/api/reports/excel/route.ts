import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ExcelJS from "exceljs";

const PURPOSE_LABEL: Record<string, string> = {
  CLIENT_VISIT: "고객사 방문",
  DELIVERY: "납품·배송",
  MEETING: "회의",
  COMMUTE: "출퇴근",
  MAINTENANCE: "차량 정비",
  PRIVATE: "사적 운행",
  OTHER: "기타",
};

function formatPurpose(purpose: string | null, purposeCode: string | null): string {
  const label =
    purposeCode && PURPOSE_LABEL[purposeCode] ? PURPOSE_LABEL[purposeCode] : purposeCode ?? "";
  if (purpose?.trim()) return label ? `${label} (${purpose})` : purpose;
  return label || "-";
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const vehicleId = searchParams.get("vehicleId");
  const driverId = searchParams.get("driverId");

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  const companyId = session.user.companyId ?? "";

  const where: Record<string, unknown> = {};
  if (!isAdmin) {
    where.driverId = session.user.id;
  } else if (companyId) {
    where.driver = { companyId };
    if (driverId) where.driverId = driverId;
  } else {
    // 관리자인데 회사 미배정: 타 회사 데이터 노출 방지
    where.driverId = session.user.id;
  }
  if (vehicleId) where.vehicleId = vehicleId;
  if (from || to) {
    where.date = {} as Record<string, Date>;
    if (from) (where.date as Record<string, Date>).gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      (where.date as Record<string, Date>).lte = toDate;
    }
  }
  where.status = { in: ["COMPLETED", "APPROVED"] };

  const trips = await prisma.trip.findMany({
    where,
    include: {
      driver: { select: { name: true } },
      vehicle: { select: { licensePlate: true, make: true, model: true } },
    },
    orderBy: { date: "asc" },
  });

  // ─── ExcelJS 워크북 생성 ──────────────────────────────────────────────
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FleetSentinel";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("업무용차량 운행일지", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  // 제목
  ws.mergeCells("A1:K1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "업무용 차량 운행일지 (국세청 양식)";
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: "center" };
  ws.getRow(1).height = 28;

  // 기간 행
  ws.mergeCells("A2:K2");
  const periodCell = ws.getCell("A2");
  const fromLabel = from ? new Date(from).toLocaleDateString("ko-KR") : "전체";
  const toLabel = to ? new Date(to).toLocaleDateString("ko-KR") : "전체";
  periodCell.value = `기간: ${fromLabel} ~ ${toLabel}  |  출력일: ${new Date().toLocaleDateString("ko-KR")}`;
  periodCell.alignment = { horizontal: "center" };
  ws.getRow(2).height = 18;

  // 컬럼 헤더
  const headers = [
    { header: "날짜", key: "date", width: 14 },
    { header: "차량번호", key: "plate", width: 14 },
    { header: "차종", key: "carType", width: 14 },
    { header: "운전자", key: "driver", width: 14 },
    { header: "출발지", key: "startAddr", width: 24 },
    { header: "도착지", key: "endAddr", width: 24 },
    { header: "출발시각", key: "startTime", width: 12 },
    { header: "도착시각", key: "endTime", width: 12 },
    { header: "운행거리(km)", key: "dist", width: 14 },
    { header: "운행목적", key: "purpose", width: 20 },
    { header: "비고", key: "note", width: 16 },
  ];
  ws.columns = headers;

  const headerRow = ws.getRow(3);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111111" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });
  headerRow.height = 22;

  // 데이터 행
  trips.forEach((trip, idx) => {
    const row = ws.addRow({
      date: new Date(trip.date).toLocaleDateString("ko-KR"),
      plate: trip.vehicle.licensePlate,
      carType: `${trip.vehicle.make} ${trip.vehicle.model}`,
      driver: trip.driver.name,
      startAddr: trip.startAddress,
      endAddr: trip.endAddress ?? "-",
      startTime: trip.startTime
        ? new Date(trip.startTime).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
        : "-",
      endTime: trip.endTime
        ? new Date(trip.endTime).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
        : "-",
      dist: Number(trip.distanceKm ?? 0),
      purpose: formatPurpose(trip.purpose, trip.purposeCode),
      note: trip.isManualEntry ? "(수동입력)" : "",
    });

    // 줄무늬
    const bgColor = idx % 2 === 0 ? "FFFFFFFF" : "FFF9FAFB";
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      cell.border = { top: { style: "hair" }, bottom: { style: "hair" }, left: { style: "hair" }, right: { style: "hair" } };
      cell.alignment = { vertical: "middle" };
    });
    // 거리 컬럼 우측 정렬
    row.getCell(9).alignment = { horizontal: "right", vertical: "middle" };
  });

  // 합계 행 (거리는 I열 = 9번째)
  const totalKm = trips.reduce((s, t) => s + Number(t.distanceKm ?? 0), 0);
  const sumRow = ws.addRow([]);
  const sumRowNum = sumRow.number;
  ws.mergeCells(`A${sumRowNum}:H${sumRowNum}`);
  const labelCell = ws.getCell(`A${sumRowNum}`);
  labelCell.value = `합계: ${trips.length}건`;
  labelCell.font = { bold: true };
  labelCell.alignment = { horizontal: "left", vertical: "middle" };
  const distCell = ws.getCell(`I${sumRowNum}`);
  distCell.value = totalKm;
  distCell.font = { bold: true };
  distCell.alignment = { horizontal: "right", vertical: "middle" };
  distCell.numFmt = "0.0";

  // 버퍼로 내보내기
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `운행일지_${fromLabel}_${toLabel}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
