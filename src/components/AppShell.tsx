import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { SideNavLinks } from "@/components/SideNavLinks";

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
  return (
    <div>
      <header className="situs">
        <nav className="nav">
          <Link href="/" className="wordmark">
            <b>SINGO MBOIS</b>
            <span>SMPN 27 Malang</span>
          </Link>
          <SignOutButton />
        </nav>
      </header>
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
