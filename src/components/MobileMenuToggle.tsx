"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Checkbox tersembunyi yang menggerakkan laci sidebar di HP (murni CSS lewat
 *  `.menu-toggle:checked ~ ...`). Satu-satunya JS di sini: centang otomatis
 *  dilepas begitu siswa berpindah halaman, supaya laci tidak nyangkut
 *  terbuka setelah menekan salah satu tautan menu. */
export function MobileMenuToggle() {
  const pathname = usePathname();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.checked = false;
  }, [pathname]);

  return <input ref={ref} type="checkbox" id="menu-toggle" className="menu-toggle" aria-hidden="true" tabIndex={-1} />;
}
