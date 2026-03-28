import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const expenseId = formData.get("expenseId") as string | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const filename = `${randomUUID()}.webp`;
  const relativePath = `/receipts/${filename}`;
  const absolutePath = join(process.cwd(), "public", "receipts", filename);

  await writeFile(absolutePath, buffer);

  // expense가 이미 생성된 경우 path 업데이트
  if (expenseId) {
    await prisma.expense.update({
      where: { id: expenseId },
      data: { receiptImagePath: relativePath },
    });
  }

  return NextResponse.json({ path: relativePath });
}
