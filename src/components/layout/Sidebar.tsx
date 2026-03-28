"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

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
  { href: "/api/auth/signout",icon: "logout",      label: "Sign Out"  },
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
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  return (
    <aside className="h-screen w-56 fixed left-0 top-0 overflow-y-auto bg-white flex flex-col border-r border-gray-200 z-50">
      {/* 로고 */}
      <div className="px-5 pt-7 pb-6">
        <Link href="/dashboard">
          <h1 className="text-base font-black tracking-tight text-black">FleetSentinel</h1>
        </Link>
        <p className="text-[9px] uppercase tracking-widest text-gray-400 mt-0.5">
          Compliance v2.1
        </p>
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
            <Link key={item.href} href={item.href} className={navLink(active)}>
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
          <Link key={item.href} href={item.href} className={navLink(false)}>
            <span className="material-symbols-outlined text-[18px] leading-none" style={{ fontSize: "18px" }}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
