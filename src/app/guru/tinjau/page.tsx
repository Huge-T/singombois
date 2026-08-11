import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TinjauListPage() {
  const session = await auth();

  const submissions = await prisma.submission.findMany({
    where: {
      submittedAt: { not: null },
      session: { createdById: session!.user.id },
    },
    include: {
      student: true,
      session: true,
      scores: { orderBy: { createdAt: "desc" }, take: 1, include: { teacherReviews: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  const pending = submissions.filter((s) => s.scores[0] && s.scores[0].teacherReviews.length === 0);
  const done = submissions.filter((s) => s.scores[0] && s.scores[0].teacherReviews.length > 0);

  return (
    <div>
      <p className="crumb">GURU</p>
      <h2 className="h2">Tinjau hasil</h2>
      <p className="sub">Mesin sudah mengusulkan skor. Setujui atau koreksi setiap lembar.</p>

      <p className="tbl-k">BELUM DITINJAU ({pending.length})</p>
      {pending.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 20 }}>Semua lembar sudah ditinjau.</p>}
      {pending.map((s, i) => (
        <div className="row" key={s.id}>
          <span className="row-n">{s.student.name}</span>
          <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{s.session.label}</span>
          <Link href={`/guru/tinjau/${s.id}`} className="btn btn-sm">
            Tinjau {i === 0 ? "" : ""}
          </Link>
        </div>
      ))}

      <p className="tbl-k" style={{ marginTop: 28 }}>
        SUDAH DITINJAU ({done.length})
      </p>
      {done.map((s) => (
        <div className="row dim" key={s.id}>
          <span className="row-n">{s.student.name}</span>
          <span style={{ fontSize: 12.5 }}>{s.session.label}</span>
          <Link href={`/guru/tinjau/${s.id}`} className="btn btn-ghost btn-sm">
            Lihat
          </Link>
        </div>
      ))}
    </div>
  );
}
