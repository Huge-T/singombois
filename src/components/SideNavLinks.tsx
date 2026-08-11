"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/components/AppShell";

export function SideNavLinks({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();

  // Longest matching prefix wins, so "/siswa/latihan" doesn't light up "/siswa".
  const activeHref = [...navItems]
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <>
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} className={activeHref === item.href ? "on" : ""}>
          {item.label}
          {item.badge ? (
            <span
              style={{ marginLeft: "auto", fontFamily: "var(--data)", fontSize: 10, color: "var(--mark)" }}
            >
              {item.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </>
  );
}
