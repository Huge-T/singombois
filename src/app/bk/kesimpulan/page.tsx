import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LEVELS, LEVEL_LABEL, type Level } from "@/lib/siswaTahunan";
import { getRekapOptions } from "@/lib/rekap";

/** Status kesimpulan tahunan per siswa: siapa yang belum, draf, atau sudah terbit. */
export default async function KesimpulanDaftarPage({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string; kelas?: string }>;
}) {
  const { tahun, kelas } = await searchParams;
  const session = await auth();
  const schoolId = session!.user.schoolId;
  const options = await getRekapOptions(schoolId);
  const year = options.years.find((y) => y.id === tahun) ?? options.years[0];

  if (!year) {
    return (
      <div>
        <p className="crumb">GURU BK</p>
        <h2 className="h2">Kesimpulan siswa</h2>
        <p className="sub">Belum ada tahun ajaran terdaftar.</p>
      </div>
    );
  }

  const classes = options.classes.filter((c) => c.academicYearId === year.id);
  const classIds = classes.map((c) => c.id);
  const selectedClass = classes.find((c) => c.id === kelas);

  const [students, validated, conclusions] = await Promise.all([
    prisma.student.findMany({
      where: {
        schoolId,
        OR: [{ classId: { in: classIds } }, { submissions: { some: { session: { classId: { in: classIds } } } } }],
      },
      select: {
        id: true,
        name: true,
        classId: true,
        submissions: {
          where: { session: { classId: { in: classIds } } },
          take: 1,
          select: { session: { select: { classId: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.submission.findMany({
      where: {
        session: { storyPromptId: { not: null }, classId: { in: classIds } },
        characterReading: { is: { status: "PUBLISHED" } },
      },
      select: { studentId: true, session: { select: { level: true } } },
    }),
    prisma.finalConclusion.findMany({
      where: { academicYearId: year.id },
      select: { studentId: true, status: true },
    }),
  ]);

  const levelsByStudent = new Map<string, Set<Level>>();
  for (const v of validated) {
    if (!levelsByStudent.has(v.studentId)) levelsByStudent.set(v.studentId, new Set());
    levelsByStudent.get(v.studentId)!.add(v.session.level as Level);
  }
  const statusByStudent = new Map(conclusions.map((c) => [c.studentId, c.status]));

  // Kelas siswa DI TAHUN INI: kelas sekarang bila termasuk tahun ini, selain itu kelas sesi yang ia ikuti.
  const rows = students.map((s) => {
    const classId = classIds.includes(s.classId) ? s.classId : (s.submissions[0]?.session.classId ?? s.classId);
    const levels = levelsByStudent.get(s.id) ?? new Set<Level>();
    return { id: s.id, name: s.name, classId, levels, status: statusByStudent.get(s.id) ?? null };
  });

  const classNameById = new Map(classes.map((c) => [c.id, c.name]));
  const summary = classes.map((c) => {
    const inClass = rows.filter((r) => r.classId === c.id);
    const siap = inClass.filter((r) => r.levels.size > 0);
    return {
      id: c.id,
      name: c.name,
      total: inClass.length,
      siap: siap.length,
      terbit: inClass.filter((r) => r.status === "PUBLISHED").length,
      draf: inClass.filter((r) => r.status === "DRAFT").length,
      belum: siap.filter((r) => !r.status).length,
    };
  });

  const list = selectedClass ? rows.filter((r) => r.classId === selectedClass.id) : [];

  return (
    <div>
      <p className="crumb">GURU BK</p>
      <h2 className="h2">Kesimpulan siswa per tahun ajaran</h2>
      <p className="sub">
        Status kesimpulan tahunan tiap siswa. &quot;Siap&quot; berarti minimal satu level tes sudah tervalidasi di
        tahun ajaran itu.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {options.years.map((y) => (
          <Link key={y.id} href={`/bk/kesimpulan?tahun=${y.id}`} className={`btn btn-sm ${y.id === year.id ? "" : "btn-ghost"}`}>
            {y.label}
          </Link>
        ))}
      </div>

      <div className="card" style={{ overflowX: "auto", marginBottom: 20 }}>
        <table className="rekap-tabel">
          <thead>
            <tr>
              <th>Kelas</th>
              <th className="n">Siswa</th>
              <th className="n">Siap</th>
              <th className="n">Belum ditulis</th>
              <th className="n">Draf</th>
              <th className="n">Terbit</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {summary.map((c) => (
              <tr key={c.id}>
                <td>
                  <b>{c.name}</b>
                </td>
                <td className="n">{c.total}</td>
                <td className="n">{c.siap}</td>
                <td className="n">{c.belum}</td>
                <td className="n">{c.draf}</td>
                <td className="n">{c.terbit}</td>
                <td>
                  <Link className="btn btn-ghost btn-sm" href={`/bk/kesimpulan?tahun=${year.id}&kelas=${c.id}`}>
                    Lihat siswa
                  </Link>
                </td>
              </tr>
            ))}
            {summary.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <small>Belum ada kelas di tahun ajaran ini.</small>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedClass && (
        <>
          <p className="tbl-k">
            {classNameById.get(selectedClass.id)} · {list.length} SISWA
          </p>
          <div className="card" style={{ overflowX: "auto" }}>
            <table className="rekap-tabel">
              <thead>
                <tr>
                  <th>Nama</th>
                  {LEVELS.map((l) => (
                    <th key={l}>{LEVEL_LABEL[l]}</th>
                  ))}
                  <th>Kesimpulan</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    {LEVELS.map((l) => (
                      <td key={l}>{r.levels.has(l) ? "tervalidasi" : "-"}</td>
                    ))}
                    <td>
                      {r.status === "PUBLISHED" ? (
                        <span className="pill pill-ok">TERBIT</span>
                      ) : r.status === "DRAFT" ? (
                        <span className="pill pill-singo">DRAF</span>
                      ) : r.levels.size > 0 ? (
                        <span className="pill pill-graphite">BELUM DITULIS</span>
                      ) : (
                        <small>menunggu validasi</small>
                      )}
                    </td>
                    <td>
                      <Link className="btn btn-ghost btn-sm" href={`/bk/kesimpulan/${r.id}?tahun=${year.id}`}>
                        {r.status ? "Buka" : r.levels.size > 0 ? "Tulis" : "Lihat"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
