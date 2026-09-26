import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell, type NavItem } from "@/components/AppShell";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function KoordinatorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const staff = session?.user
    ? await prisma.staffUser.findUnique({ where: { id: session.user.id } })
    : null;

  const [pendingConsent, pendingFeedback, pendingParentReviews] = staff
    ? await Promise.all([
        prisma.student.count({ where: { schoolId: staff.schoolId, consentStatus: "PENDING" } }),
        prisma.feedback.count({
          where: { student: { schoolId: staff.schoolId }, approved: false, displayConsent: { not: "TIDAK" } },
        }),
        prisma.parentReview.count({ where: { approved: false } }),
      ])
    : [0, 0, 0];

  const navItems: NavItem[] = [
    { href: "/koordinator", label: "Ringkasan" },
    { href: "/koordinator/indikator", label: "Indikator jurnal" },
    { href: "/koordinator/materi", label: "Bank materi" },
    { href: "/koordinator/kokurikuler", label: "Kokurikuler" },
    { href: "/koordinator/siswa", label: "Kelas & siswa", badge: pendingConsent || undefined },
    { href: "/koordinator/staf", label: "Kelola staf" },
    { href: "/koordinator/tanggapan", label: "Ulasan", badge: pendingFeedback + pendingParentReviews || undefined },
    { href: "/koordinator/log-akses", label: "Log akses" },
  ];

  return (
    <AppShell
      sideLabel="KOORDINATOR"
      navItems={navItems}
      userName={staff?.name ?? ""}
      userRoleLabel={staff?.role === "COORDINATOR" ? "Koordinator Program" : staff?.role ?? ""}
      userInitials={staff ? initials(staff.name) : "?"}
    >
      {children}
    </AppShell>
  );
}
