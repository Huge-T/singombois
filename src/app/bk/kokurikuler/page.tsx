import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function BkKokurikulerQueuePage() {
  const session = await auth();
  const schoolId = session!.user.schoolId;

  const attempts = await prisma.kokurikulerAttempt.findMany({
    where: {
      submittedAt: { not: null },
      quiz: { class: { schoolId } },
      OR: [{ reading: null }, { reading: { status: "DRAFT" } }],
    },
    include: { student: true, quiz: true, reading: true },
    orderBy: { submittedAt: "asc" },
  });

  return (
    <div>
      <p className="crumb">GURU BK</p>
      <h2 className="h2">Antrean analisis kepribadian kokurikuler</h2>
      <p className="sub">Kuis kokurikuler yang sudah dikumpulkan siswa dan belum punya analisis terbit.</p>

      {attempts.length === 0 && <p className="hint">Antrean kosong.</p>}

      {attempts.map((a) => (
        <div className="card" key={a.id} style={{ marginBottom: 12 }}>
          <p>
            <strong>{a.student.name}</strong> <span className="hint">· {a.quiz.label}</span>{" "}
            {a.reading?.status === "DRAFT" && <span className="pill">Draf ada</span>}
          </p>
          <Link className="btn btn-ghost btn-sm" href={`/bk/kokurikuler/${a.id}`}>
            Baca &amp; tulis analisis
          </Link>
        </div>
      ))}
    </div>
  );
}
