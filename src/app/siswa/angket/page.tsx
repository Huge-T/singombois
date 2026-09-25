import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SiswaUlasanListPage() {
  const session = await auth();
  const student = await prisma.student.findUnique({ where: { id: session!.user.id } });
  if (!student) return null;

  const submissions = await prisma.submission.findMany({
    where: { studentId: student.id, submittedAt: { not: null } },
    include: { session: true, feedbacks: true },
    orderBy: { submittedAt: "desc" },
  });

  return (
    <div>
      <p className="crumb">SISWA · {student.name.toUpperCase()}</p>
      <h2 className="h2">Ulasan</h2>
      <p className="sub">Beri ulasan & rating untuk tiap sesi literasi yang sudah kamu selesaikan.</p>

      {submissions.length === 0 && (
        <p className="hint">Belum ada sesi yang selesai kamu kerjakan. Ulasan muncul di sini setelahnya.</p>
      )}

      {submissions.map((s) => {
        const feedback = s.feedbacks[0];
        return (
          <div key={s.id} className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
              <div>
                <h3 style={{ fontFamily: "var(--disp)", fontSize: 17, marginBottom: 4 }}>{s.session.label}</h3>
                {feedback && (
                  <p style={{ fontSize: 15, color: "var(--singo)" }}>
                    {"★".repeat(feedback.clarityScore)}
                    <span style={{ color: "var(--garis)" }}>{"★".repeat(5 - feedback.clarityScore)}</span>
                  </p>
                )}
              </div>
              <span className={`pill ${feedback ? "pill-ok" : "pill-mark"}`}>
                {feedback ? "SUDAH DIULAS" : "BELUM DIULAS"}
              </span>
            </div>
            <div style={{ marginTop: 10 }}>
              <Link href={`/siswa/sesi/${s.sessionId}/angket`} className="btn btn-sm">
                {feedback ? "Ubah ulasan" : "Beri ulasan"}
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
