import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { daysAgo } from "@/lib/time";
import { AppShell, type NavItem } from "@/components/AppShell";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function SiswaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const student = session?.user
    ? await prisma.student.findUnique({
        where: { id: session.user.id },
        include: { class: true },
      })
    : null;

  const [newReadings, answeredTickets] = session?.user
    ? await Promise.all([
        prisma.characterReading.count({
          where: {
            submission: { studentId: session.user.id },
            status: "PUBLISHED",
            publishedAt: { gte: daysAgo(7) },
          },
        }),
        prisma.consultTicket.count({ where: { studentId: session.user.id, status: "ANSWERED" } }),
      ])
    : [0, 0];

  const navItems: NavItem[] = [
    { href: "/siswa", label: "Sesi & hasil", badge: newReadings || undefined },
    { href: "/siswa/kokurikuler", label: "Kokurikuler" },
    { href: "/siswa/latihan", label: "Latihan saya" },
    { href: "/siswa/konsultasi", label: "Konsultasiku", badge: answeredTickets || undefined },
    { href: "/siswa/angket", label: "Ulasan" },
    { href: "/siswa/data-saya", label: "Data tentang saya" },
  ];

  return (
    <AppShell
      sideLabel="SISWA"
      navItems={navItems}
      userName={student?.name ?? session?.user?.name ?? ""}
      userRoleLabel={student?.class.name ?? ""}
      userInitials={student ? initials(student.name) : "?"}
    >
      {children}
    </AppShell>
  );
}
