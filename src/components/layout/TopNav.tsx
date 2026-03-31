"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTripTrackingOptional } from "@/hooks/useGpsTracker";

const TAB_ITEMS = [
  { href: "/dashboard", label: "Fleet Overview" },
  { href: "/reports", label: "Compliance" },
  { href: "/settings", label: "Integrations" },
];

export function TopNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const trip = useTripTrackingOptional();
  const tracking = trip?.stage === "tracking";

  return (
    <header className="fixed top-0 right-0 left-56 md:left-64 h-16 bg-white z-40 border-b border-gray-200 flex justify-between items-center px-4 md:px-10 font-[Manrope] text-sm">
      <div className="flex items-center gap-4 md:gap-10 min-w-0 flex-1">
        {tracking && (
          <Link
            href="/logs/track"
            className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-[#CAFF33] bg-[#CAFF33]/15 px-2.5 py-1.5 text-xs font-bold text-[#0a0a0a] hover:bg-[#CAFF33]/25"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0a0a0a] opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0a0a0a]" />
            </span>
            GPS 추적 중
          </Link>
        )}
        {/* 검색 */}
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-gray-400 text-lg">search</span>
          <input
            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg w-72 focus:outline-none focus:ring-1 focus:ring-black text-sm"
            placeholder="차량번호, 운전자, 목적지 검색..."
            type="text"
          />
        </div>

        {/* 상단 탭 */}
        <nav className="hidden lg:flex gap-8">
          {TAB_ITEMS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`font-medium py-5 border-b-2 transition-colors ${
                  active
                    ? "text-black font-bold border-black"
                    : "text-gray-500 border-transparent hover:text-black"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 우측 - 사용자 정보 */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 pr-6 border-r border-gray-200">
          <button className="p-2 text-gray-400 hover:text-black relative">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <Link href="/billing" className="p-2 text-gray-400 hover:text-black">
            <span className="material-symbols-outlined">credit_card</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-extrabold text-black">{session?.user?.name ?? "사용자"}</p>
            <p className="text-[10px] uppercase font-bold text-gray-400">
              {session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN"
                ? "Fleet Manager"
                : "Employee"}
            </p>
          </div>
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt="프로필"
              className="w-9 h-9 rounded-lg border border-gray-200 object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
              {(session?.user?.name ?? "U").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
