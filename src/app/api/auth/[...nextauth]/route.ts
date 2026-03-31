import type { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";

export const runtime = "nodejs";

async function handle(req: NextRequest, method: "GET" | "POST") {
  try {
    return await handlers[method](req);
  } catch (err) {
    console.error(`[next-auth ${method}]`, err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      {
        error: "AuthHandlerError",
        message: process.env.NODE_ENV === "development" ? message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

export const GET = (req: NextRequest) => handle(req, "GET");
export const POST = (req: NextRequest) => handle(req, "POST");
