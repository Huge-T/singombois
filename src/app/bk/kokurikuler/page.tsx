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
    include: { student: true, quiz: { include: { class: true } }, reading: true },
    orderBy: { submittedAt: "asc" },
  });

  // Kelompokkan per kelas, sama seperti Antrean pembacaan literasi — lebih
  // gampang dicari kalau BK mau fokus ke satu kelas dulu.
  const byClass = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const name = a.quiz.class.name;
    if (!byClass.has(name)) byClass.set(name, []);
    byClass.get(name)!.push(a);
  }
  const groups = [...byClass.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      <p className="crumb">GURU BK</p>
      <h2 className="h2">Antrean analisis kepribadian kokurikuler</h2>
      <p className="sub">Kuis kokurikuler yang sudah dikumpulkan siswa dan belum punya analisis terbit.</p>

      {attempts.length === 0 && <p className="hint">Antrean kosong.</p>}

      {groups.map(([className, items]) => (
        <div key={className} style={{ marginBottom: 24 }}>
          <p className="tbl-k">
            KELAS {className} ({items.length})
          </p>
          {items.map((a) => (
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
      ))}
    </div>
  );
}
