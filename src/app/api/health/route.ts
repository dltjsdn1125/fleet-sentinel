import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** DB 연결 확인용 — 브라우저에서 GET /api/health */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, database: "connected" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/health]", err);
    return Response.json(
      {
        ok: false,
        database: "error",
        message: process.env.NODE_ENV === "development" ? message : "Database unavailable",
      },
      { status: 503 }
    );
  }
}
