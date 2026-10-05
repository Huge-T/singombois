import Link from "next/link";
import { logoSingoMbois } from "@/content/assets";
import { NavAccount } from "@/components/NavAccount";
import { MobileMenuToggle } from "@/components/MobileMenuToggle";

const links = [
  { href: "/metode", label: "Grafologi" },
  { href: "/program", label: "Cara ikut" },
  { href: "/penelitian", label: "Penelitian" },
  { href: "/tim", label: "Tim" },
  { href: "/giat", label: "Giat" },
  { href: "/untuk-sekolah-lain", label: "Sekolah lain" },
];

export function PublicNav({ active }: { active?: string }) {
  const logo = logoSingoMbois();
  // Status login SENGAJA tidak dibaca di server: itu memaksa semua halaman
  // publik dirender ulang di origin tiap kunjungan (no-store) dan menghabiskan
  // kuota Fast Origin Transfer. NavAccount membacanya di browser.
  return (
    <>
      <MobileMenuToggle />
      <header className="situs">
        <nav className="nav" aria-label="Navigasi utama">
          <Link className="merek" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo && <img src={logo} alt="Logo SINGO MBOIS" />}
            <span className="merek-lines">
              <b>SINGO MBOIS</b>
              <span>SMPN 27 Malang</span>
            </span>
          </Link>
          <div className="nav-tautan">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={`tautan ${active === l.href ? "aktif" : ""}`}>
                {l.label}
              </Link>
            ))}
          </div>
          <label htmlFor="menu-toggle" className="menu-tombol" aria-label="Buka menu navigasi">
            <span />
            <span />
            <span />
          </label>
          <NavAccount />
        </nav>
      </header>
    </>
  );
}
