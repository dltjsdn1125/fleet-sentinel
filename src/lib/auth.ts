import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const googleId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
const hasGoogleOAuth = Boolean(googleId && googleSecret);

/** Auth.js v5: 로컬호스트·리버스 프록시에서 세션/콜백 URL 불일치 방지 */
const trustHost = true;

/**
 * AUTH_SECRET 또는 NEXTAUTH_SECRET 필수(배포).
 * 개발만 비어 있을 때 임시값으로 /api/auth/* 500(Configuration) 방지.
 */
const authSecret =
  process.env.AUTH_SECRET?.trim() ||
  process.env.NEXTAUTH_SECRET?.trim() ||
  (process.env.NODE_ENV === "development"
    ? "fleet-sentinel-dev-only-secret-change-me"
    : undefined);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost,
  session: { strategy: "jwt" },
  secret: authSecret,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...(hasGoogleOAuth
      ? [
          Google({
            clientId: googleId,
            clientSecret: googleSecret,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { company: true },
        });

        if (!user || !user.password || !user.isActive) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.companyId = (user as { companyId?: string }).companyId;
      }
      // 소셜 로그인 시 DB에서 role/companyId 조회
      if (account && account.provider !== "credentials") {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.companyId = dbUser.companyId ?? undefined;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.companyId = token.companyId as string | undefined;
      }
      return session;
    },
    async signIn({ user, account }) {
      // 소셜 로그인 시 신규 사용자는 EMPLOYEE로 생성
      if (account?.provider === "google" && user.email) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (!existing) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? "사용자",
              image: user.image,
              role: "EMPLOYEE",
            },
          });
        }
      }
      return true;
    },
  },
});

// 타입 확장
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      role: string;
      companyId?: string;
    };
  }
}
