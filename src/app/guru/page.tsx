import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function GuruDashboard() {
  const session = await auth();
  const sessions = await prisma.session.findMany({
    where: { createdById: session!.user.id },
    include: {
      class: true,
      submissions: { where: { submittedAt: { not: null } } },
      targetedStudents: true,
    },
    orderBy: { opensAt: "desc" },
  });

  return (
    <div>
      <p className="crumb">GURU</p>
      <h2 className="h2">Sesi saya</h2>
      <p className="sub">Sesi literasi yang kamu buat untuk kelas bimbinganmu.</p>

      <Link href="/guru/sesi/baru" className="btn" style={{ marginBottom: 24, display: "inline-block" }}>
        + Buat sesi baru
      </Link>

      {sessions.length === 0 && (
        <p style={{ fontSize: 14, color: "var(--ink-2)" }}>Belum ada sesi. Buat sesi pertamamu.</p>
      )}

      {sessions.map((s) => (
        <div key={s.id} className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <h3 style={{ fontFamily: "var(--disp)", fontSize: 19, marginBottom: 4 }}>{s.label}</h3>
              <p style={{ fontSize: 12.5, color: "var(--graphite)", fontFamily: "var(--data)" }}>
                {s.class.name}
                {s.storyPromptId ? ` · LEVEL ${s.level}` : ""}
                {s.targetedStudents.length > 0 ? ` · ${s.targetedStudents.length} SISWA TERPILIH` : ""}
                {" · "}
                {s.submissions.length} SUDAH KUMPUL · {s.status}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href={`/guru/sesi/${s.id}/cetak`} className="btn btn-ghost btn-sm">
                Cetak lembar kerja
              </Link>
              <Link href="/guru/tinjau" className="btn btn-sm">
                Tinjau hasil
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
