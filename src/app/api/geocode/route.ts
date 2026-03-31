import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) return NextResponse.json([]);

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=kr&format=json&limit=6&accept-language=ko`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "FleetSentinel/1.0 (fleet-management-system)",
      "Accept-Language": "ko,en;q=0.9",
    },
    next: { revalidate: 60 },
  });

  const data = await res.json();
  return NextResponse.json(data);
}
