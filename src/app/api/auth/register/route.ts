import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const {
      name, email, password, companyName,
      bizNumber, bizDocUrl, ceoName, industry, plan,
    } = await req.json();

    if (!name || !email || !password || !companyName) {
      return NextResponse.json({ error: "필수 항목을 모두 입력해주세요." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 400 });
    }

    const planRecord = await prisma.plan.findFirst({
      where: { name: (plan ?? "STARTER").toUpperCase() },
    });

    const company = await prisma.company.create({
      data: {
        name: companyName,
        bizNumber: bizNumber || undefined,
        bizDocUrl: bizDocUrl || undefined,
        ceoName: ceoName || undefined,
        industry: industry || undefined,
        subscriptionStatus: "TRIAL",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        planId: planRecord?.id,
      },
    });

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: "ADMIN",
        companyId: company.id,
      },
    });

    return NextResponse.json({ userId: user.id, companyId: company.id }, { status: 201 });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
