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

export default async function GuruLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const staff = session?.user
    ? await prisma.staffUser.findUnique({ where: { id: session.user.id } })
    : null;

  const pendingReview = staff
    ? await prisma.submission.count({
        where: {
          submittedAt: { not: null },
          session: { createdById: staff.id },
          scores: { some: { teacherReviews: { none: {} } } },
        },
      })
    : 0;

  const navItems: NavItem[] = [
    { href: "/guru", label: "Sesi saya" },
    { href: "/guru/tinjau", label: "Tinjau hasil", badge: pendingReview || undefined },
    { href: "/guru/kokurikuler", label: "Kokurikuler" },
    { href: "/guru/kelas", label: "Kelas" },
  ];

  return (
    <AppShell
      sideLabel="GURU"
      navItems={navItems}
      userName={staff?.name ?? ""}
      userRoleLabel={staff?.role === "TEACHER" ? "Wali kelas" : staff?.role ?? ""}
      userInitials={staff ? initials(staff.name) : "?"}
    >
      {children}
    </AppShell>
  );
}
