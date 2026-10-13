import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GESTALT_VERSION, TEKANAN_INFO } from "@/lib/gestalt";
import { buildConclusionDraft, getStudentYearRecap, getStudentYears } from "@/lib/siswaTahunan";
import { ConclusionForm } from "./ConclusionForm";

export default async function KesimpulanPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ tahun?: string }>;
}) {
  const { studentId } = await params;
  const { tahun } = await searchParams;
  const session = await auth();

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: true },
  });
  if (!student || student.schoolId !== session!.user.schoolId) notFound();

  const years = await getStudentYears(studentId);
  const selected =
    years.find((y) => y.id === tahun) ?? years.find((y) => y.id === student.class.academicYearId) ?? years[0];
  if (!selected) notFound();

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      actorType: "staff",
      action: "VIEW_FINAL_CONCLUSION_RECAP",
      entity: "Student",
      entityId: studentId,
    },
  });

  const [recap, conclusion, conclusionStatuses] = await Promise.all([
    getStudentYearRecap(studentId, selected.id),
    prisma.finalConclusion.findUnique({
      where: { studentId_academicYearId: { studentId, academicYearId: selected.id } },
    }),
    prisma.finalConclusion.findMany({ where: { studentId }, select: { academicYearId: true, status: true } }),
  ]);
  if (!recap) notFound();

  const statusByYear = new Map(conclusionStatuses.map((c) => [c.academicYearId, c.status]));
  const validatedCount = recap.validatedLevels.length;
  const canPublish = validatedCount >= 1;
  const draft = buildConclusionDraft(recap);

  return (
    <div>
      <p className="crumb">
        GURU BK · KESIMPULAN TAHUNAN
        {conclusion && (
          <span
            className={`pill ${conclusion.status === "PUBLISHED" ? "pill-ok" : "pill-singo"}`}
            style={{ marginLeft: 10 }}
          >
            {conclusion.status === "PUBLISHED" ? "SUDAH TERBIT" : "DRAF"}
          </span>
        )}
      </p>
      <h2 className="h2">{student.name}</h2>
      <p className="sub">
        {student.class.name} · tahun ajaran {recap.yearLabel} · {validatedCount} dari 3 level tervalidasi. Rekap di
        bawah disusun otomatis dari hasil tahun ajaran ini; kesimpulannya kamu yang menulis.
      </p>

      {years.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {years.map((y) => {
            const st = statusByYear.get(y.id);
            return (
              <Link
                key={y.id}
                href={`/bk/kesimpulan/${studentId}?tahun=${y.id}`}
                className={`btn btn-sm ${y.id === selected.id ? "" : "btn-ghost"}`}
              >
                {y.label}
                {st === "PUBLISHED" ? " · terbit" : st === "DRAFT" ? " · draf" : ""}
              </Link>
            );
          })}
        </div>
      )}

      <div className="bk-rev">
        <div>
          {recap.levels.map(({ level, label, state, gestalt, strengths }) => (
            <div className="card" key={level} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 8 }}>
                <b style={{ fontSize: 14 }}>{label}</b>
                {state === "TERVALIDASI" ? (
                  <span className="pill pill-ok">TERVALIDASI</span>
                ) : state === "MENUNGGU" ? (
                  <span className="pill pill-singo">MENUNGGU VALIDASI</span>
                ) : (
                  <span className="pill pill-graphite">BELUM DIKERJAKAN</span>
                )}
              </div>
              {gestalt && (
                <ul style={{ listStyle: "none", display: "grid", gap: 4, marginBottom: 8 }}>
                  {gestalt.map((g) => (
                    <li key={g.variable} style={{ fontSize: 12.5, color: "var(--tinta-lembut)" }}>
                      {g.measured
                        ? `${g.variableLabel}: ${g.category} (${
                            g.variable === "kemiringan"
                              ? `${g.rawValue > 0 ? "+" : ""}${g.rawValue.toFixed(0)}°`
                              : `${g.rawValue.toFixed(1)} ${g.unit}`
                          }) · ${g.title}`
                        : `${g.variableLabel}: tidak terukur`}
                    </li>
                  ))}
                </ul>
              )}
              {strengths.length > 0 && (
                <p style={{ fontSize: 12.5, color: "var(--tinta-lembut)" }}>
                  Pembacaan BK: {strengths.map((s) => s.title).join("; ")}
                </p>
              )}
            </div>
          ))}

          {recap.kokurikuler.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <b style={{ fontSize: 14 }}>Kuis kokurikuler tahun ini</b>
              <ul style={{ listStyle: "none", display: "grid", gap: 6, margin: "8px 0 0" }}>
                {recap.kokurikuler.map((k, i) => (
                  <li key={i} style={{ fontSize: 12.5, color: "var(--tinta-lembut)" }}>
                    <b>{k.quizLabel}</b>
                    {k.finalScore != null ? ` · nilai ${Math.round(k.finalScore)}` : ""}
                    {k.dimensions.length > 0 &&
                      ` · ${k.dimensions.map((d) => `${d.dimension} ${d.pct}%`).join(", ")}`}
                    {k.conclusionText && (
                      <span style={{ display: "block", marginTop: 2 }}>{k.conclusionText}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recap.literasi.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <b style={{ fontSize: 14 }}>Skor literasi tahun ini</b>
              <ul style={{ listStyle: "none", display: "grid", gap: 6, margin: "8px 0 0" }}>
                {recap.literasi.map((l, i) => (
                  <li key={i} style={{ fontSize: 12.5, color: "var(--tinta-lembut)" }}>
                    <b>{l.sessionLabel}</b>
                    {l.reading != null ? ` · membaca ${Math.round(l.reading)}` : ""}
                    {l.listening != null ? ` · menyimak ${Math.round(l.listening)}` : ""}
                    {l.writingContent != null ? ` · isi tulisan ${Math.round(l.writingContent)}` : ""}
                    {l.writingQuality != null ? ` · kerapian ${Math.round(l.writingQuality)}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="hint">
            Rekap mesin memakai {GESTALT_VERSION}. {TEKANAN_INFO}
          </p>
        </div>

        <ConclusionForm
          key={recap.yearId}
          studentId={studentId}
          academicYearId={recap.yearId}
          yearLabel={recap.yearLabel}
          initialBody={conclusion?.body ?? ""}
          status={conclusion?.status ?? null}
          canPublish={canPublish}
          initialUpdatedAt={conclusion?.updatedAt.toISOString() ?? null}
          draft={draft}
        />
      </div>
    </div>
  );
}
