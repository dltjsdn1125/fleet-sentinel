import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BUCKET = "biz-docs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

  // 허용 형식: PDF, JPG, PNG
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "PDF, JPG, PNG 파일만 업로드 가능합니다." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "파일 크기는 10MB 이하여야 합니다." }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "pdf";
  const path = `${session.user.companyId ?? session.user.id}/${Date.now()}.${ext}`;

  // Supabase Storage REST API로 업로드
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
  const arrayBuffer = await file.arrayBuffer();

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: arrayBuffer,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    console.error("Supabase upload error:", err);
    // 버킷이 없으면 public URL 대신 data URL 방식으로 폴백
    if (err.includes("Bucket not found") || err.includes("bucket")) {
      // base64로 DB에 저장 (소규모 파일용 폴백)
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;
      return NextResponse.json({ url: dataUrl });
    }
    return NextResponse.json({ error: "파일 업로드에 실패했습니다." }, { status: 500 });
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  return NextResponse.json({ url: publicUrl });
}
