import { PrismaClient } from "@prisma/client";

/**
 * Prisma는 `postgresql://` 전용입니다. `file:./dev.db` 등 SQLite URL은 스키마와 맞지 않아
 * NextAuth(`/api/auth/*`)가 500을 냅니다.
 * Prisma 연결 문자열은 `FLEET_DATABASE_URL`을 사용합니다(시스템 `DATABASE_URL`과 충돌 방지).
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
