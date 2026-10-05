"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";

/** Tombol akun di menu atas halaman publik + ping kunjungan. Halaman publik
 *  di-cache CDN, jadi status login tidak boleh dibaca di server saat render;
 *  ping kunjungan (yang memang sudah dikirim tiap pemuatan halaman) sekalian
 *  membawa pulang tujuan "Ke beranda saya" kalau pengunjung sedang login.
 *  Gagal pun halaman tidak terganggu: tampilan awal sama dengan tamu. */
export function NavAccount() {
  const pathname = usePathname();
  const [home, setHome] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/kunjungan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    })
      .then((r) => r.json())
      .then((d: { home?: string | null }) => setHome(d.home ?? null))
      .catch(() => {});
  }, [pathname]);

  if (home) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <Link href={home} className="tombol tombol-utama tombol-kecil">
          Ke beranda saya
        </Link>
        <SignOutButton />
      </span>
    );
  }
  return (
    <Link href="/masuk" className="tombol tombol-utama tombol-kecil">
      Masuk
    </Link>
  );
}
