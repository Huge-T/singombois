import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AspectScore } from "@/lib/rubric";
import type { RawFeatures } from "@/lib/analysis";
import { GESTALT_VERSION, TEKANAN_INFO, interpretGestalt } from "@/lib/gestalt";
import { ReadingForm } from "./ReadingForm";
import type { StrengthItem } from "./actions";

export default async function BkReadingPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  const session = await auth();

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      student: true,
      session: true,
      artifacts: { orderBy: { createdAt: "desc" }, take: 1, include: { featureSet: true } },
      scores: { orderBy: { createdAt: "desc" }, take: 1 },
      characterReading: true,
    },
  });
  if (!submission || submission.student.schoolId !== session!.user.schoolId) notFound();

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      actorType: "staff",
      action: "VIEW_CHARACTER_READING_SOURCE",
      entity: "Submission",
      entityId: submissionId,
    },
  });

  const artifact = submission.artifacts[0];
  const score = submission.scores[0];
  const measurable: AspectScore[] = score ? JSON.parse(score.aspectsJson).filter((a: AspectScore) => a.measured) : [];
  const reading = submission.characterReading;
  const strengths: StrengthItem[] = reading ? JSON.parse(reading.strengthsJson) : [];
  const gestaltResults =
    artifact?.kind === "TULISAN" && artifact.featureSet
      ? interpretGestalt(JSON.parse(artifact.featureSet.featuresJson) as RawFeatures)
      : null;
  const isGestaltSession = Boolean(submission.session.storyPromptId);

  return (
    <div>
      <p className="crumb">
        GURU BK · {submission.session.label.toUpperCase()}
        {isGestaltSession ? ` · LEVEL ${submission.session.level}` : ""}
        {reading && (
          <span className={`pill ${reading.status === "PUBLISHED" ? "pill-ok" : "pill-singo"}`} style={{ marginLeft: 10 }}>
            {reading.status === "PUBLISHED" ? "SUDAH TERBIT" : "DRAF"}
          </span>
        )}
      </p>
      <h2 className="h2">{submission.student.name}</h2>
      <p className="sub">
        Baca dengan fokus pada potensi positif. Hasil ini hanya terlihat oleh siswa dan tim BK,
        terpisah dari skor literasi teknis yang ditinjau wali kelas.
      </p>

      <div className="bk-rev">
        <div>
          <div className="rev-img" style={{ marginBottom: 16 }}>
            {artifact ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artifact.originalPath} alt={`Lembar ${artifact.kind === "GAMBAR" ? "gambar" : "tulisan"} siswa`} />
            ) : (
              <p style={{ fontSize: 13, color: "var(--graphite)" }}>Tidak ada berkas.</p>
            )}
          </div>

          {gestaltResults && (
            <div className="rev-side" style={{ marginBottom: 16 }}>
              <h5>INDIKASI MESIN ({GESTALT_VERSION.toUpperCase()}) · REFERENSI, BUKAN KEPUTUSAN</h5>
              {gestaltResults.map((g) =>
                g.measured ? (
                  <div className="rev-item" key={g.variable}>
                    <div className="rev-top">
                      <span>{g.variableLabel}</span>
                      <b>
                        {g.variable === "kemiringan"
                          ? `${g.rawValue > 0 ? "+" : ""}${g.rawValue.toFixed(0)}°`
                          : `${g.rawValue.toFixed(1)} ${g.unit}`}
                      </b>
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--tinta-lembut)", lineHeight: 1.55 }}>
                      {g.category}: {g.title}. {g.description}
                    </p>
                  </div>
                ) : (
                  <div className="rev-item" key={g.variable}>
                    <div className="rev-top">
                      <span>{g.variableLabel}</span>
                      <b>-</b>
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--tinta-lembut)" }}>{g.reason}</p>
                  </div>
                )
              )}
              <p className="hint">{TEKANAN_INFO}</p>
            </div>
          )}

          {measurable.length > 0 && (
            <div className="rev-side">
              <h5>SKOR TEKNIS PENDUKUNG (bukan bahan pembacaan karakter)</h5>
              {measurable.map((a) => (
                <div className="rev-item" key={a.key}>
                  <div className="rev-top">
                    <span>{a.label}</span>
                    <b>{a.score?.toFixed(0)}</b>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <ReadingForm
          submissionId={submissionId}
          initialStrengths={strengths}
          initialLearningSuggestions={reading?.learningSuggestions ?? ""}
          initialNotes={reading?.notes ?? ""}
          initialStatus={reading?.status ?? null}
          initialUpdatedAt={reading?.updatedAt.toISOString() ?? null}
        />
      </div>
    </div>
  );
}
