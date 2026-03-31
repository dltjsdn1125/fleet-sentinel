"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSidebar } from "@/contexts/SidebarContext";

const NAV_ITEMS = [
  { href: "/dashboard",   icon: "dashboard",     label: "Dashboard",     adminOnly: false },
  { href: "/logs",        icon: "list_alt",       label: "Trip Logs",     adminOnly: false },
  { href: "/expenses",    icon: "receipt_long",   label: "Expenses",      adminOnly: false },
  { href: "/fleet",       icon: "directions_car", label: "Fleet & Staff", adminOnly: true  },
  { href: "/reports",     icon: "assessment",     label: "Reports",       adminOnly: true  },
  { href: "/my-reports",  icon: "edit_note",      label: "My Reports",    adminOnly: false, employeeOnly: true },
  { href: "/settings",    icon: "settings",       label: "Settings",      adminOnly: false },
];

const BOTTOM_ITEMS = [
  { href: "/logs/track",      icon: "add_circle",  label: "New Trip"  },
  { href: "/billing",         icon: "credit_card", label: "Billing"   },
  { href: "/support",         icon: "help",        label: "Support"   },
  { href: "/signout",         icon: "logout",      label: "Sign Out"  },
];

const navLink = (active: boolean) =>
  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
    active
      ? "bg-gray-100 text-[#0a0a0a] font-medium"
      : "text-gray-500 hover:text-[#0a0a0a] hover:bg-gray-50 font-normal"
  }`;

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isOpen, close } = useSidebar();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={close}
        />
      )}

      <aside
        className={`
          h-screen w-64 md:w-56 fixed left-0 top-0 overflow-y-auto bg-white flex flex-col border-r border-gray-200 z-50
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* 로고 */}
        <div className="px-5 pt-7 pb-6 flex items-center justify-between">
          <Link href="/dashboard" onClick={close}>
            <h1 className="text-base font-black tracking-tight text-black">FleetSentinel</h1>
            <p className="text-[9px] uppercase tracking-widest text-gray-400 mt-0.5">
              Compliance v2.1
            </p>
          </Link>
          {/* 모바일 닫기 버튼 */}
          <button
            onClick={close}
            className="md:hidden p-1 text-gray-400 hover:text-black"
            aria-label="메뉴 닫기"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* 내비게이션 */}
        <nav className="flex-1 px-3">
          {NAV_ITEMS.filter((item) => {
            if (item.adminOnly) return isAdmin;
            if ((item as any).employeeOnly) return !isAdmin;
            return true;
          }).map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={navLink(active)} onClick={close}>
                <span className="material-symbols-outlined text-[18px] leading-none" style={{ fontSize: "18px" }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 구분선 */}
        <div className="mx-5 border-t border-gray-100 mb-1" />

        {/* 하단 링크 */}
        <div className="px-3 pb-6">
          {BOTTOM_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={navLink(false)} onClick={close}>
              <span className="material-symbols-outlined text-[18px] leading-none" style={{ fontSize: "18px" }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </aside>
    </>
  );
}
