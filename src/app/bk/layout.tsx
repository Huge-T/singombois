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

export default async function BkLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const staff = session?.user
    ? await prisma.staffUser.findUnique({ where: { id: session.user.id } })
    : null;

  const [pendingReadings, openTickets, pendingKokurikulerReadings] = staff
    ? await Promise.all([
        prisma.submission.count({
          where: {
            student: { schoolId: staff.schoolId },
            submittedAt: { not: null },
            artifacts: { some: {} },
            characterReading: null,
          },
        }),
        prisma.consultTicket.count({
          where: { student: { schoolId: staff.schoolId }, status: { in: ["OPEN"] } },
        }),
        prisma.kokurikulerAttempt.count({
          where: {
            submittedAt: { not: null },
            quiz: { class: { schoolId: staff.schoolId } },
            OR: [{ reading: null }, { reading: { status: "DRAFT" } }],
          },
        }),
      ])
    : [0, 0, 0];

  const navItems: NavItem[] = [
    { href: "/bk", label: "Antrean pembacaan", badge: pendingReadings || undefined },
    { href: "/bk/kokurikuler", label: "Kokurikuler", badge: pendingKokurikulerReadings || undefined },
    { href: "/bk/tiket", label: "Tiket konsultasi", badge: openTickets || undefined },
  ];

  return (
    <AppShell
      sideLabel="GURU BK"
      navItems={navItems}
      userName={staff?.name ?? ""}
      userRoleLabel={staff?.role === "GURU_BK" ? "Guru BK" : staff?.role ?? ""}
      userInitials={staff ? initials(staff.name) : "?"}
    >
      {children}
    </AppShell>
  );
}
