import Link from "next/link";
import { logoSingoMbois } from "@/content/assets";
import { VisitPing } from "@/components/VisitPing";

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
  return (
    <header className="situs">
      <VisitPing />
      <nav className="nav" aria-label="Navigasi utama">
        <Link className="merek" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo && <img src={logo} alt="Logo SINGO MBOIS" />}
          <b>SINGO MBOIS</b>
          <span>SMPN 27 Malang</span>
        </Link>
        <div className="nav-tautan">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`tautan ${active === l.href ? "aktif" : ""}`}>
              {l.label}
            </Link>
          ))}
        </div>
        <Link href="/masuk" className="tombol tombol-utama tombol-kecil">
          Masuk
        </Link>
      </nav>
    </header>
  );
}
