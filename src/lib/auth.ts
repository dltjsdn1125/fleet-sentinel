import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const googleId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
const hasGoogle = Boolean(googleId && googleSecret);

const kakaoId = process.env.KAKAO_CLIENT_ID?.trim() ?? "";
const kakaoSecret = process.env.KAKAO_CLIENT_SECRET?.trim() ?? "";
const hasKakao = Boolean(kakaoId && kakaoSecret);

const trustHost = true;

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
    ...(hasGoogle
      ? [Google({ clientId: googleId, clientSecret: googleSecret })]
      : []),
    ...(hasKakao
      ? [Kakao({ clientId: kakaoId, clientSecret: kakaoSecret })]
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
          needsOnboarding: false,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.companyId = (user as any).companyId;
        token.needsOnboarding = (user as any).needsOnboarding ?? false;
      }
      // 소셜 로그인 시 DB에서 최신 정보 조회
      if (account && account.provider !== "credentials") {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
          include: { company: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.companyId = dbUser.companyId ?? undefined;
          token.needsOnboarding = !dbUser.companyId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.companyId = token.companyId as string | undefined;
        session.user.needsOnboarding = token.needsOnboarding as boolean;
      }
      return session;
    },
    async signIn({ user, account }) {
      // 소셜 신규 가입: companyId 없이 ADMIN으로 생성 → 온보딩에서 기업정보 입력
      if (
        (account?.provider === "google" || account?.provider === "kakao") &&
        user.email
      ) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (!existing) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? "사용자",
              image: user.image,
              role: "ADMIN",
            },
          });
        }
      }
      return true;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      role: string;
      companyId?: string;
      needsOnboarding?: boolean;
    };
  }
}
