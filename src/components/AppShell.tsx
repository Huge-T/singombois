import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { SideNavLinks } from "@/components/SideNavLinks";
import { MobileMenuToggle } from "@/components/MobileMenuToggle";
import { logoSingoMbois } from "@/content/assets";

export interface NavItem {
  href: string;
  label: string;
  badge?: number;
}

export function AppShell({
  sideLabel,
  navItems,
  userName,
  userRoleLabel,
  userInitials,
  children,
}: {
  sideLabel: string;
  navItems: NavItem[];
  userName: string;
  userRoleLabel: string;
  userInitials: string;
  children: React.ReactNode;
}) {
  const logo = logoSingoMbois();
  return (
    <div>
      <MobileMenuToggle />
      <header className="situs">
        <nav className="nav">
          <Link href="/" className="wordmark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo && <img src={logo} alt="Logo SINGO MBOIS" />}
            <span className="wordmark-lines">
              <b>SINGO MBOIS</b>
              <span>SMPN 27 Malang</span>
            </span>
          </Link>
          <label htmlFor="menu-toggle" className="menu-tombol" aria-label="Buka menu navigasi">
            <span />
            <span />
            <span />
          </label>
          <SignOutButton />
        </nav>
      </header>
      <label htmlFor="menu-toggle" className="menu-latar" aria-hidden="true" />
      <div className="app">
        <aside className="side">
          <p className="side-k">{sideLabel}</p>
          <SideNavLinks navItems={navItems} />
          <div className="side-sep" />
          <div className="side-user">
            <span className="av">{userInitials}</span>
            <div>
              {userName}
              <br />
              <small>{userRoleLabel}</small>
            </div>
          </div>
        </aside>
        <div className="main">{children}</div>
      </div>
    </div>
  );
}
