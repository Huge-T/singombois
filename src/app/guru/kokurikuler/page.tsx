import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function KokurikulerListPage() {
  const session = await auth();
  const user = session!.user;
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  const quizzes = await prisma.kokurikulerQuiz.findMany({
    where: isAdmin ? { class: { schoolId: user.schoolId } } : { createdById: user.id },
    include: {
      class: true,
      _count: { select: { questions: true, attempts: true } },
      attempts: { where: { submittedAt: { not: null }, finalScore: null }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <p className="crumb">GURU</p>
      <h2 className="h2">Kokurikuler</h2>
      <p className="sub">Kuis pemahaman materi kokurikuler — nilai otomatis + analisis kepribadian.</p>

      <Link href="/guru/kokurikuler/baru" className="btn" style={{ marginBottom: 20, display: "inline-block" }}>
        + Buat kuis baru
      </Link>

      {quizzes.length === 0 && <p className="hint">Belum ada kuis kokurikuler.</p>}

      {quizzes.map((q) => (
        <div className="card" key={q.id} style={{ marginBottom: 12 }}>
          <p>
            <strong>{q.label}</strong> <span className="pill">{q.status}</span>
          </p>
          <p className="hint">
            {q.class.name} {q.tema ? `· Tema ${q.tema}` : ""} · {q._count.questions} soal · {q._count.attempts}{" "}
            terkumpul
            {q.attempts.length > 0 ? ` · ${q.attempts.length} menunggu nilai esai` : ""}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Link className="btn btn-ghost btn-sm" href={`/guru/kokurikuler/${q.id}`}>
              Kelola soal
            </Link>
            <Link className="btn btn-ghost btn-sm" href={`/guru/kokurikuler/${q.id}/hasil`}>
              Lihat hasil
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
