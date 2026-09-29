import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function BkAntreanPage({
  searchParams,
}: {
  searchParams: Promise<{ jenis?: string; kelas?: string }>;
}) {
  const { jenis, kelas } = await searchParams;
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
      session: { include: { class: true } },
      artifacts: { orderBy: { createdAt: "desc" }, take: 1 },
      characterReading: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  // Kelompokkan per kelas — daftar 200+ lembar tanpa pengelompokan menyulitkan
  // BK mencari kelas tertentu. Diurutkan nama kelas (VII-A < VIII-A < IX-C
  // kebetulan ikut terurut benar secara string karena awalan angka romawinya).
  function groupByClass<T extends { session: { class: { name: string } } }>(items: T[]): [string, T[]][] {
    const byClass = new Map<string, T[]>();
    for (const item of items) {
      const name = item.session.class.name;
      if (!byClass.has(name)) byClass.set(name, []);
      byClass.get(name)!.push(item);
    }
    return [...byClass.entries()].sort(([a], [b]) => a.localeCompare(b));
  }

  // Sesi Screening (Gestalt, Level LOW/MID/HIGH) dan sesi literasi rutin
  // mingguan sebelumnya digabung jadi satu daftar panjang tanpa filter —
  // dipisah lewat tab jenis=gestalt|literasi (default: semua) supaya BK
  // bisa fokus ke satu jenis dulu.
  const bySession = jenis
    ? submissions.filter((s) => (jenis === "gestalt" ? Boolean(s.session.storyPromptId) : !s.session.storyPromptId))
    : submissions;

  // Tab kelas: pilih satu kelas supaya tidak perlu scroll menyusuri semua
  // kelas sekaligus. "Semua kelas" (kelas kosong) tetap menampilkan ringkasan
  // terkelompok seperti sebelumnya.
  const classNames = [...new Set(bySession.map((s) => s.session.class.name))].sort((a, b) => a.localeCompare(b));
  const byClass = kelas ? bySession.filter((s) => s.session.class.name === kelas) : bySession;

  const pending = byClass.filter((s) => !s.characterReading);
  const done = byClass.filter((s) => s.characterReading?.status === "PUBLISHED");
  const drafted = byClass.filter((s) => s.characterReading?.status === "DRAFT");

  function tabLink(overrides: { jenis?: string; kelas?: string }) {
    const nextJenis = "jenis" in overrides ? overrides.jenis : jenis;
    const nextKelas = "kelas" in overrides ? overrides.kelas : kelas;
    const params = new URLSearchParams();
    if (nextJenis) params.set("jenis", nextJenis);
    if (nextKelas) params.set("kelas", nextKelas);
    const qs = params.toString();
    return qs ? `/bk?${qs}` : "/bk";
  }

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

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href={tabLink({ jenis: undefined })} className={`btn btn-sm ${!jenis ? "" : "btn-ghost"}`}>
          Semua
        </Link>
        <Link href={tabLink({ jenis: "gestalt" })} className={`btn btn-sm ${jenis === "gestalt" ? "" : "btn-ghost"}`}>
          Screening (Gestalt)
        </Link>
        <Link href={tabLink({ jenis: "literasi" })} className={`btn btn-sm ${jenis === "literasi" ? "" : "btn-ghost"}`}>
          Literasi rutin
        </Link>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <Link href={tabLink({ kelas: undefined })} className={`btn btn-sm ${!kelas ? "" : "btn-ghost"}`}>
          Semua kelas
        </Link>
        {classNames.map((name) => (
          <Link key={name} href={tabLink({ kelas: name })} className={`btn btn-sm ${kelas === name ? "" : "btn-ghost"}`}>
            {name}
          </Link>
        ))}
      </div>

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
      {groupByClass(pending).map(([className, items]) => (
        <div key={className} style={{ marginBottom: 18 }}>
          {!kelas && (
            <p className="hint" style={{ fontWeight: 700, marginBottom: 6 }}>
              KELAS {className} ({items.length})
            </p>
          )}
          {items.map((s) => (
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
        </div>
      ))}

      {drafted.length > 0 && (
        <>
          <p className="tbl-k" style={{ marginTop: 28 }}>
            DRAF BELUM DIPUBLIKASI ({drafted.length})
          </p>
          {groupByClass(drafted).map(([className, items]) => (
            <div key={className} style={{ marginBottom: 18 }}>
              {!kelas && (
                <p className="hint" style={{ fontWeight: 700, marginBottom: 6 }}>
                  KELAS {className} ({items.length})
                </p>
              )}
              {items.map((s) => (
                <div className="row" key={s.id}>
                  <span className="row-n">{s.student.name}</span>
                  <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{s.session.label}</span>
                  <Link href={`/bk/${s.id}`} className="btn btn-sm">
                    Lanjutkan
                  </Link>
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      <p className="tbl-k" style={{ marginTop: 28 }}>
        SUDAH DIPUBLIKASIKAN ({done.length}) · 15 TERBARU DITAMPILKAN
      </p>
      {groupByClass(done.slice(0, 15)).map(([className, items]) => (
        <div key={className} style={{ marginBottom: 18 }}>
          {!kelas && (
            <p className="hint" style={{ fontWeight: 700, marginBottom: 6 }}>
              KELAS {className} ({items.length})
            </p>
          )}
          {items.map((s) => (
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
      ))}
    </div>
  );
}
