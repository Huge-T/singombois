import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GESTALT_DISCLAIMER, GESTALT_VERSION } from "@/lib/gestalt";
import { KOKURIKULER_PATTERN_DISCLAIMER } from "@/lib/kokurikulerPersonality";
import {
  AMBANG_KUAT,
  MIN_N_YAKIN,
  REKAP_VERSION,
  computeGestaltRecap,
  computeKokurikulerRecap,
  computeYearTable,
  getRekapOptions,
  gestaltConclusions,
  kokurikulerConclusions,
  type RekapFilter,
} from "@/lib/rekap";
import { DistRows } from "./DistRows";
import { PrintButton } from "./PrintButton";

export interface RekapSearchParams {
  tahun?: string;
  tingkat?: string;
  kelas?: string;
  level?: string;
  kuis?: string;
  valid?: string;
}

const LEVELS = [
  ["LOW", "Level 1 (screening awal)"],
  ["MIDDLE", "Level 2"],
  ["HIGH", "Level 3"],
] as const;

export async function RekapPage({
  basePath,
  roleLabel,
  searchParams,
}: {
  basePath: string;
  roleLabel: string;
  searchParams: Promise<RekapSearchParams>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const schoolId = session!.user.schoolId;
  const options = await getRekapOptions(schoolId);

  const grade = [7, 8, 9].includes(Number(sp.tingkat)) ? Number(sp.tingkat) : undefined;
  const filter: RekapFilter = {
    academicYearId: options.years.find((y) => y.id === sp.tahun)?.id,
    grade,
    classId: options.classes.find((c) => c.id === sp.kelas)?.id,
    level: LEVELS.find(([k]) => k === sp.level)?.[0],
    quizId: options.quizzes.find((q) => q.id === sp.kuis)?.id,
    validatedOnly: sp.valid === "1",
  };

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      actorType: "staff",
      action: "VIEW_AGGREGATE_RECAP",
      entity: "School",
      entityId: schoolId,
    },
  });

  const [gestalt, kok, yearRows] = await Promise.all([
    computeGestaltRecap(filter, schoolId),
    computeKokurikulerRecap(filter, schoolId),
    computeYearTable(schoolId, !!filter.validatedOnly),
  ]);
  const gKes = gestaltConclusions(gestalt);
  const kKes = kokurikulerConclusions(kok);

  const classOptions = options.classes.filter(
    (c) => (!filter.academicYearId || c.academicYearId === filter.academicYearId) && (!grade || c.grade === grade)
  );
  const quizOptions = options.quizzes.filter((q) => !filter.classId || q.classId === filter.classId);

  const tahunLabel = options.years.find((y) => y.id === filter.academicYearId)?.label ?? "semua tahun ajaran";
  const kelasLabel = filter.classId
    ? options.classes.find((c) => c.id === filter.classId)?.name
    : grade
      ? `kelas ${grade}`
      : "semua kelas";
  const levelLabel = LEVELS.find(([k]) => k === filter.level)?.[1] ?? "semua level";
  const dasarLabel = filter.validatedOnly ? "hanya yang sudah divalidasi Guru BK" : "semua yang terukur";
  const wib = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "long", timeStyle: "short" });
  const adaFilter = Object.values(sp).some(Boolean);

  return (
    <div className="rekap">
      <p className="crumb">{roleLabel}</p>
      <h2 className="h2">Rekap kesimpulan siswa</h2>
      <p className="sub">
        Gambaran kecenderungan siswa dari hasil analisis tulisan (grafologi Gestalt) dan kuis kokurikuler. Dihitung
        langsung dari data saat halaman dibuka, jadi berubah mengikuti tes yang dikerjakan siswa.
      </p>

      <form method="get" className="rekap-filter" action={basePath}>
        <div className="field">
          <label htmlFor="rk-tahun">Tahun ajaran</label>
          <select id="rk-tahun" name="tahun" defaultValue={filter.academicYearId ?? ""}>
            <option value="">Semua</option>
            {options.years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="rk-tingkat">Tingkat</label>
          <select id="rk-tingkat" name="tingkat" defaultValue={grade ? String(grade) : ""}>
            <option value="">Semua</option>
            {[7, 8, 9].map((g) => (
              <option key={g} value={g}>
                Kelas {g}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="rk-kelas">Kelas</label>
          <select id="rk-kelas" name="kelas" defaultValue={filter.classId ?? ""}>
            <option value="">Semua</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="rk-level">Level tes (Gestalt)</label>
          <select id="rk-level" name="level" defaultValue={filter.level ?? ""}>
            <option value="">Semua</option>
            {LEVELS.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="rk-kuis">Kuis (kokurikuler)</label>
          <select id="rk-kuis" name="kuis" defaultValue={filter.quizId ?? ""}>
            <option value="">Semua</option>
            {quizOptions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
        </div>
        <label className="rekap-saklar">
          <input type="checkbox" name="valid" value="1" defaultChecked={!!filter.validatedOnly} /> Hanya yang sudah
          divalidasi Guru BK
        </label>
        <div className="rekap-aksi">
          <button className="btn btn-sm" type="submit">
            Terapkan
          </button>
          {adaFilter && (
            <Link className="btn btn-ghost btn-sm" href={basePath}>
              Atur ulang
            </Link>
          )}
          <PrintButton />
        </div>
      </form>

      <p className="rekap-lingkup">
        <b>Cakupan:</b> {tahunLabel} · {kelasLabel} · {levelLabel} · {dasarLabel}. Dibuat {wib} WIB.
      </p>

      {gestalt.analysed > 0 && gestalt.analysed < MIN_N_YAKIN && (
        <div className="error-box">
          Sampel kecil (hanya {gestalt.analysed} pengerjaan). Persentase di bawah belum bisa dijadikan dasar kesimpulan.
        </div>
      )}

      <p className="tbl-k">KESIMPULAN</p>
      <div className="card rekap-kesimpulan">
        {gKes.pernyataan.length + kKes.length === 0 ? (
          <p className="hint">
            Belum ada kesimpulan untuk filter ini: belum ada hasil yang cukup (minimal 5 yang terukur per variabel).
          </p>
        ) : (
          <>
            <ul>
              {gKes.pernyataan.map((p) => (
                <li key={p}>{p}</li>
              ))}
              {kKes.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            {gKes.implikasi.length > 0 && (
              <>
                <h4>Implikasi untuk pembelajaran (usulan awal, tinjau bersama Guru BK)</h4>
                <ul>
                  {gKes.implikasi.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
        <p className="hint">
          {GESTALT_DISCLAIMER} ({GESTALT_VERSION}, {REKAP_VERSION})
        </p>
      </div>

      <p className="tbl-k">
        DIAGRAM TULISAN TANGAN · {gestalt.analysed} pengerjaan dari {gestalt.students} siswa
        {gestalt.withoutAnalysis > 0 && `, ${gestalt.withoutAnalysis} tidak bisa dianalisis`}
      </p>
      {gestalt.analysed === 0 ? (
        <div className="card">
          <p className="hint">Belum ada hasil analisis tulisan yang cocok dengan filter ini.</p>
        </div>
      ) : (
        <div className="kisi rekap-kisi">
          {gestalt.variables.map((v) => (
            <div className="kartu" key={v.variable}>
              <h3>{v.label}</h3>
              <p className="hint">
                Terukur untuk {v.measured} dari {gestalt.analysed} pengerjaan ({v.coveragePct}%).
                {v.coveragePct < 50 && " Cakupan rendah, hasil belum mewakili seluruh siswa."}
              </p>
              {v.measured > 0 ? <DistRows shares={v.shares} /> : <p className="hint">Belum ada yang terukur.</p>}
            </div>
          ))}
        </div>
      )}

      <p className="tbl-k">
        KUIS KOKURIKULER · {kok.attempts} pengerjaan, {kok.quizzes} kuis
      </p>
      {kok.dimensions.length === 0 ? (
        <div className="card">
          <p className="hint">Belum ada pengerjaan kuis kokurikuler yang cocok dengan filter ini.</p>
        </div>
      ) : (
        <div className="card">
          <ul className="rekap-rows">
            {kok.dimensions.map((d) => (
              <li key={d.dimension}>
                <div className="rekap-baris-judul">
                  <span>
                    <b>{d.dimension}</b>
                    <small>
                      {" "}
                      · {d.strongPct}% siswa mencapai ≥{AMBANG_KUAT}% (n={d.attempts})
                    </small>
                  </span>
                  <span className="rekap-nilai">{d.meanPct}%</span>
                </div>
                <div className="rekap-track" role="img" aria-label={`${d.dimension}: rata-rata ${d.meanPct} persen`}>
                  <i style={{ width: `${d.meanPct}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="hint">Nilai = rata-rata persen jawaban sesuai kunci per dimensi. {KOKURIKULER_PATTERN_DISCLAIMER}</p>
        </div>
      )}

      <p className="tbl-k">REKAP PER TAHUN AJARAN (KATEGORI DOMINAN, TULISAN TANGAN)</p>
      <div className="card" style={{ overflowX: "auto" }}>
        <table className="rekap-tabel">
          <thead>
            <tr>
              <th>Tahun ajaran</th>
              <th className="n">Siswa</th>
              {yearRows[0]?.tops.map((t) => <th key={t.variable}>{t.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {yearRows.map((r) => (
              <tr key={r.yearId}>
                <td>{r.yearLabel}</td>
                <td className="n">{r.students}</td>
                {r.tops.map((t) => (
                  <td key={t.variable}>
                    {t.measured >= 5 ? (
                      <>
                        {t.title} <small>({t.pct}%, n={t.measured})</small>
                      </>
                    ) : (
                      <small>belum cukup data</small>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {yearRows.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <small>Belum ada tahun ajaran terdaftar.</small>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="hint">Tabel ini tidak terpengaruh filter tahun, kelas, dan level; hanya saklar validasi.</p>
      </div>
    </div>
  );
}
