import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { companyName, bizNumber, ceoName, industry, bizDocUrl, plan } = await req.json();

  if (!companyName) {
    return NextResponse.json({ error: "회사명은 필수입니다." }, { status: 400 });
  }

  // 이미 회사가 있으면 업데이트
  if (session.user.companyId) {
    await prisma.company.update({
      where: { id: session.user.companyId },
      data: {
        name: companyName,
        bizNumber: bizNumber || undefined,
        ceoName: ceoName || undefined,
        industry: industry || undefined,
        bizDocUrl: bizDocUrl || undefined,
      },
    });
    return NextResponse.json({ ok: true });
  }

  // 신규 회사 생성 후 유저에 연결
  const planRecord = await prisma.plan.findFirst({
    where: { name: (plan ?? "STARTER").toUpperCase() },
  });

  const company = await prisma.company.create({
    data: {
      name: companyName,
      bizNumber: bizNumber || undefined,
      ceoName: ceoName || undefined,
      industry: industry || undefined,
      bizDocUrl: bizDocUrl || undefined,
      subscriptionStatus: "TRIAL",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      planId: planRecord?.id,
    },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { companyId: company.id, role: "ADMIN" },
  });

  return NextResponse.json({ ok: true, companyId: company.id });
}
