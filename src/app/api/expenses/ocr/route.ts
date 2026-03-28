import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "OCR not configured" }, { status: 501 });
  }

  const { imageBase64 } = await req.json();
  if (!imageBase64) return NextResponse.json({ error: "No image" }, { status: 400 });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/webp",
              data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
            },
          },
          {
            type: "text",
            text: `이 영수증 이미지에서 다음 정보를 추출해 JSON으로만 응답하세요 (다른 텍스트 없이):
{
  "vendor": "가맹점/업체명",
  "amount": 숫자(원, 합계금액),
  "date": "YYYY-MM-DD 형식, 없으면 null",
  "cardLast4": "카드 끝 4자리, 없으면 null",
  "description": "주요 구매 항목 요약, 없으면 null",
  "liters": 주유량 리터 숫자 또는 null,
  "pricePerL": 리터당 가격 숫자 또는 null,
  "category": "FUEL|MAINTENANCE|CAR_WASH|PARKING|TOLL|OTHER 중 하나"
}`,
          },
        ],
      },
    ],
  });

  const text = (message.content[0] as { type: string; text: string }).text.trim();
  try {
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Parse failed", raw: text }, { status: 422 });
  }
}
