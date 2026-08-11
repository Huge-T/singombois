import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SiswaDashboard() {
  const session = await auth();
  const student = await prisma.student.findUnique({ where: { id: session!.user.id } });
  if (!student) return null;

  const sessions = await prisma.session.findMany({
    where: {
      classId: student.classId,
      status: "OPEN",
      // Sesi tertarget hanya tampil untuk siswa yang dipilih gurunya.
      OR: [{ targetedStudents: { none: {} } }, { targetedStudents: { some: { studentId: student.id } } }],
    },
    include: {
      submissions: { where: { studentId: student.id }, include: { scores: true } },
    },
    orderBy: { opensAt: "desc" },
  });

  const blocked = student.consentStatus !== "GRANTED";

  return (
    <div>
      <p className="crumb">SISWA · {student.name.toUpperCase()}</p>
      <h2 className="h2">Sesi literasi</h2>
      <p className="sub">Sesi yang ditugaskan wali kelasmu untuk kelas ini.</p>

      {blocked && (
        <div className="error-box">
          Persetujuan wali murid untuk unggah lembar kerja belum disetujui. Kamu masih bisa
          membaca dan menyimak, tapi belum bisa mengunggah foto lembar jawaban sampai wali kelasmu
          mengonfirmasi persetujuan.
        </div>
      )}

      {sessions.length === 0 && (
        <p style={{ fontSize: 14, color: "var(--ink-2)" }}>Belum ada sesi yang dibuka untuk kelasmu.</p>
      )}

      {sessions.map((s) => {
        const submission = s.submissions[0];
        const done = Boolean(submission?.submittedAt);
        return (
          <div key={s.id} className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <h3 style={{ fontFamily: "var(--disp)", fontSize: 19, marginBottom: 4 }}>{s.label}</h3>
                <p style={{ fontSize: 12.5, color: "var(--graphite)", fontFamily: "var(--data)" }}>
                  {s.storyPromptId ? `LEVEL ${s.level} · ` : ""}
                  DIBUKA {s.opensAt.toLocaleDateString("id-ID")} · TUTUP {s.closesAt.toLocaleDateString("id-ID")}
                </p>
              </div>
              <span className={`pill ${done ? "pill-ok" : "pill-mark"}`}>
                {done ? "SELESAI" : "BELUM DIKERJAKAN"}
              </span>
            </div>
            <div style={{ marginTop: 14 }}>
              {done ? (
                <Link href={`/siswa/sesi/${s.id}/hasil`} className="btn btn-sm">
                  Lihat hasil
                </Link>
              ) : (
                <Link href={`/siswa/sesi/${s.id}`} className="btn btn-sm">
                  Kerjakan sesi
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
