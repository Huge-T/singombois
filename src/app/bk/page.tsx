import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function BkAntreanPage() {
  const session = await auth();
  const schoolId = session!.user.schoolId;

  const submissions = await prisma.submission.findMany({
    where: {
      student: { schoolId },
      submittedAt: { not: null },
      artifacts: { some: {} },
      // Antrean pembacaan personal = sesi Gestalt + sesi kelas VII-C demo lama;
      // sesi massal data-dummy (rombel tambahan) sudah punya reading terbit dan
      // tetap tampil di bagian "sudah dipublikasikan" via filter yang sama.
    },
    include: {
      student: true,
      session: true,
      artifacts: { orderBy: { createdAt: "desc" }, take: 1 },
      characterReading: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  const pending = submissions.filter((s) => !s.characterReading);
  const done = submissions.filter((s) => s.characterReading?.status === "PUBLISHED");
  const drafted = submissions.filter((s) => s.characterReading?.status === "DRAFT");

  // Progres level Gestalt per siswa: level dianggap selesai bila ada submission
  // sesi Gestalt di level itu dengan pembacaan BK yang sudah terbit.
  const gestaltValidated = submissions.filter(
    (s) => s.session.storyPromptId && s.characterReading?.status === "PUBLISHED"
  );
  const levelsByStudent = new Map<string, { name: string; levels: Set<string> }>();
  for (const s of gestaltValidated) {
    if (!levelsByStudent.has(s.studentId)) {
      levelsByStudent.set(s.studentId, { name: s.student.name, levels: new Set() });
    }
    levelsByStudent.get(s.studentId)!.levels.add(s.session.level);
  }
  const readyToConclude = [...levelsByStudent.entries()].filter(([, v]) => v.levels.size >= 3);
  const conclusions = await prisma.finalConclusion.findMany({
    where: { studentId: { in: readyToConclude.map(([id]) => id) } },
  });
  const conclusionByStudent = new Map(conclusions.map((c) => [c.studentId, c]));

  return (
    <div>
      <p className="crumb">GURU BK</p>
      <h2 className="h2">Antrean pembacaan</h2>
      <p className="sub">
        Lembar tulisan dan gambar yang siswa unggah, menunggu dibaca dengan fokus pada potensi
        positif. Ini terpisah dari skor teknis literasi yang ditinjau wali kelas.
      </p>

      {readyToConclude.length > 0 && (
        <>
          <p className="tbl-k">SIAP DISIMPULKAN · 3 LEVEL TERVALIDASI ({readyToConclude.length})</p>
          {readyToConclude.map(([studentId, v]) => {
            const conclusion = conclusionByStudent.get(studentId);
            return (
              <div className="row" key={studentId}>
                <span className="row-n">{v.name}</span>
                <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                  {conclusion?.status === "PUBLISHED"
                    ? "Kesimpulan akhir sudah terbit"
                    : conclusion
                      ? "Draf kesimpulan tersimpan"
                      : "Belum ada kesimpulan akhir"}
                </span>
                <Link href={`/bk/kesimpulan/${studentId}`} className="btn btn-sm">
                  {conclusion?.status === "PUBLISHED" ? "Lihat" : "Simpulkan"}
                </Link>
              </div>
            );
          })}
          <div style={{ marginBottom: 24 }} />
        </>
      )}

      <p className="tbl-k">BELUM DIBACA ({pending.length})</p>
      {pending.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 20 }}>
          Tidak ada lembar yang menunggu.
        </p>
      )}
      {pending.map((s) => (
        <div className="row" key={s.id}>
          <span className="row-n">{s.student.name}</span>
          <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
            {s.session.label}
            {s.session.storyPromptId ? ` · Level ${s.session.level}` : ""} ·{" "}
            {s.artifacts[0]?.kind === "GAMBAR" ? "Gambar" : "Tulisan"}
          </span>
          <Link href={`/bk/${s.id}`} className="btn btn-sm">
            Baca
          </Link>
        </div>
      ))}

      {drafted.length > 0 && (
        <>
          <p className="tbl-k" style={{ marginTop: 28 }}>
            DRAF BELUM DIPUBLIKASI ({drafted.length})
          </p>
          {drafted.map((s) => (
            <div className="row" key={s.id}>
              <span className="row-n">{s.student.name}</span>
              <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{s.session.label}</span>
              <Link href={`/bk/${s.id}`} className="btn btn-sm">
                Lanjutkan
              </Link>
            </div>
          ))}
        </>
      )}

      <p className="tbl-k" style={{ marginTop: 28 }}>
        SUDAH DIPUBLIKASIKAN ({done.length}) · 15 TERBARU DITAMPILKAN
      </p>
      {done.slice(0, 15).map((s) => (
        <div className="row dim" key={s.id}>
          <span className="row-n">{s.student.name}</span>
          <span style={{ fontSize: 12.5 }}>
            {s.session.label}
            {s.session.storyPromptId ? ` · Level ${s.session.level}` : ""}
          </span>
          <Link href={`/bk/${s.id}`} className="btn btn-ghost btn-sm">
            Lihat
          </Link>
        </div>
      ))}
    </div>
  );
}
