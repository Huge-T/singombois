import Link from "next/link";
import { logoSingoMbois } from "@/content/assets";
import { VisitPing } from "@/components/VisitPing";
import { auth, type AppRole } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";
import { MobileMenuToggle } from "@/components/MobileMenuToggle";

const links = [
  { href: "/metode", label: "Grafologi" },
  { href: "/program", label: "Cara ikut" },
  { href: "/penelitian", label: "Penelitian" },
  { href: "/tim", label: "Tim" },
  { href: "/giat", label: "Giat" },
  { href: "/untuk-sekolah-lain", label: "Sekolah lain" },
];

const ROLE_HOME: Record<AppRole, string> = {
  STUDENT: "/siswa",
  TEACHER: "/guru",
  GURU_BK: "/bk",
  COORDINATOR: "/koordinator",
  ADMIN: "/koordinator",
  SUPER_ADMIN: "/koordinator",
};

export async function PublicNav({ active }: { active?: string }) {
  const logo = logoSingoMbois();
  // Halaman publik (mis. beranda) tidak sadar sesi login sama sekali —
  // guru/admin yang klik wordmark dari dasbor mereka mendarat di sini dan
  // cuma lihat tombol "Masuk" generik, kelihatan seperti otomatis logout
  // padahal sesinya masih valid. Tunjukkan jalan balik + tombol Keluar asli.
  const session = await auth();
  return (
    <>
      <MobileMenuToggle />
      <header className="situs">
        <VisitPing />
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
          {session?.user ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Link href={ROLE_HOME[session.user.role]} className="tombol tombol-utama tombol-kecil">
                Ke beranda saya
              </Link>
              <SignOutButton />
            </span>
          ) : (
            <Link href="/masuk" className="tombol tombol-utama tombol-kecil">
              Masuk
            </Link>
          )}
        </nav>
      </header>
    </>
  );
}
