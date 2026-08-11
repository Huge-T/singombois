import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SiswaKokurikulerListPage() {
  const session = await auth();
  const student = await prisma.student.findUnique({ where: { id: session!.user.id } });
  if (!student) return null;

  const quizzes = await prisma.kokurikulerQuiz.findMany({
    where: {
      classId: student.classId,
      status: "OPEN",
      OR: [{ targetedStudents: { none: {} } }, { targetedStudents: { some: { studentId: student.id } } }],
    },
    include: { attempts: { where: { studentId: student.id } } },
    orderBy: { opensAt: "desc" },
  });

  return (
    <div>
      <p className="crumb">SISWA · {student.name.toUpperCase()}</p>
      <h2 className="h2">Kokurikuler</h2>
      <p className="sub">Kuis kokurikuler yang ditugaskan gurumu.</p>

      {quizzes.length === 0 && <p className="hint">Belum ada kuis kokurikuler yang dibuka untuk kelasmu.</p>}

      {quizzes.map((q) => {
        const attempt = q.attempts[0];
        const done = Boolean(attempt?.submittedAt);
        return (
          <div key={q.id} className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <h3 style={{ fontFamily: "var(--disp)", fontSize: 19, marginBottom: 4 }}>{q.label}</h3>
                <p style={{ fontSize: 12.5, color: "var(--graphite)", fontFamily: "var(--data)" }}>
                  {q.tema ? `TEMA ${q.tema.toUpperCase()} · ` : ""}TUTUP {q.closesAt.toLocaleDateString("id-ID")}
                </p>
              </div>
              <span className={`pill ${done ? "pill-ok" : "pill-mark"}`}>
                {done ? "SUDAH DIKUMPULKAN" : "BELUM DIKERJAKAN"}
              </span>
            </div>
            {!done && (
              <div style={{ marginTop: 14 }}>
                <Link href={`/siswa/kokurikuler/${q.id}`} className="btn btn-sm">
                  Kerjakan
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
