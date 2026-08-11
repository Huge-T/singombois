import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function KoordinatorKokurikulerPage() {
  const session = await auth();
  const schoolId = session!.user.schoolId;

  const quizzes = await prisma.kokurikulerQuiz.findMany({
    where: { class: { schoolId } },
    include: { class: true, createdBy: true, _count: { select: { questions: true, attempts: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <p className="crumb">KOORDINATOR</p>
      <h2 className="h2">Kokurikuler</h2>
      <p className="sub">Daftar kuis kokurikuler seluruh sekolah — hasil hanya tampil setelah analisis diterbitkan.</p>

      {quizzes.length === 0 && <p className="hint">Belum ada kuis kokurikuler.</p>}

      {quizzes.map((q) => (
        <div className="card" key={q.id} style={{ marginBottom: 12 }}>
          <p>
            <strong>{q.label}</strong> <span className="pill">{q.status}</span>
          </p>
          <p className="hint">
            {q.class.name} {q.tema ? `· Tema ${q.tema}` : ""} · dibuat {q.createdBy.name} · {q._count.questions} soal
            · {q._count.attempts} terkumpul
          </p>
          <Link className="btn btn-ghost btn-sm" href={`/koordinator/kokurikuler/${q.id}/hasil`}>
            Lihat hasil
          </Link>
        </div>
      ))}
    </div>
  );
}
