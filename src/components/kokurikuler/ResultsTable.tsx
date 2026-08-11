import Link from "next/link";

interface AttemptRow {
  id: string;
  student: { name: string; nisn: string };
  submittedAt: Date | null;
  autoCorrect: number | null;
  autoTotal: number | null;
  essayScore: number | null;
  finalScore: number | null;
  reading: { status: "DRAFT" | "PUBLISHED" } | null;
}

export function ResultsTable({
  attempts,
  basePath,
  hasEssayQuestions,
}: {
  attempts: AttemptRow[];
  basePath: string;
  hasEssayQuestions: boolean;
}) {
  if (attempts.length === 0) {
    return <p className="hint">Belum ada siswa yang mengumpulkan kuis ini.</p>;
  }

  return (
    <table className="ind">
      <thead>
        <tr>
          <th>Siswa</th>
          <th>Terkumpul</th>
          <th>Objektif</th>
          {hasEssayQuestions && <th>Esai</th>}
          <th>Nilai akhir</th>
          <th>Analisis kepribadian</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {attempts.map((a) => (
          <tr key={a.id}>
            <td>
              {a.student.name} <span className="hint">({a.student.nisn})</span>
            </td>
            <td>{a.submittedAt ? "Sudah" : "Belum"}</td>
            <td>{a.autoTotal ? `${a.autoCorrect}/${a.autoTotal}` : "-"}</td>
            {hasEssayQuestions && <td>{a.essayScore !== null ? a.essayScore : "Menunggu dinilai"}</td>}
            <td>{a.finalScore !== null ? a.finalScore : "Menunggu"}</td>
            <td>
              {a.reading?.status === "PUBLISHED" ? (
                <span className="pill pill-ok">Terbit</span>
              ) : a.reading?.status === "DRAFT" ? (
                <span className="pill">Draf</span>
              ) : (
                <span className="hint">Belum ditulis</span>
              )}
            </td>
            <td>
              <Link className="btn btn-ghost btn-sm" href={`${basePath}/${a.id}`}>
                Lihat
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
