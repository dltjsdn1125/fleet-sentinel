"use client";
import { signOut } from "next-auth/react";
import Link from "next/link";

export default function SignOutPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/dashboard" className="text-2xl font-extrabold tracking-tight uppercase">
            FleetSentinel
          </Link>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">
            Compliance v2.1
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-gray-300">logout</span>
          </div>

          <h1 className="text-2xl font-extrabold mb-2">로그아웃</h1>
          <p className="text-gray-400 text-sm mb-8">정말 로그아웃 하시겠습니까?</p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full bg-black text-white py-3 rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors"
            >
              로그아웃
            </button>
            <Link
              href="/dashboard"
              className="w-full border border-gray-200 text-gray-600 py-3 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors"
            >
              취소
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
