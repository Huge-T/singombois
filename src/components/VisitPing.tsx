"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Kirim satu ping kunjungan per pemuatan halaman publik. Fire-and-forget:
 *  gagal pun halaman tidak terganggu, dan dedup harian terjadi di server. */
export function VisitPing() {
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/kunjungan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
