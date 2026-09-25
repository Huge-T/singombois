import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AspectScore } from "@/lib/rubric";
import { cohensKappa, kappaHealthLabel, scoreBand } from "@/lib/kappa";
import { ReviewPanel } from "./ReviewPanel";

export default async function TinjauDetailPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  const session = await auth();

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      student: true,
      session: true,
      artifacts: { orderBy: { createdAt: "desc" }, take: 1 },
      scores: { orderBy: { createdAt: "desc" }, take: 1, include: { teacherReviews: true } },
    },
  });
  if (!submission || submission.session.createdById !== session!.user.id) notFound();

  const score = submission.scores[0];
  if (!score) notFound();
  const aspects: AspectScore[] = JSON.parse(score.aspectsJson);
  const reviewByAspect = new Map(score.teacherReviews.map((r) => [r.aspect, r]));

  const allReviews = await prisma.teacherReview.findMany({ where: { reviewerId: session!.user.id } });
  const kappaPairs = allReviews.map(
    (r) => [scoreBand(r.machineValue), scoreBand(r.teacherValue)] as [ReturnType<typeof scoreBand>, ReturnType<typeof scoreBand>]
  );
  const kappa = cohensKappa(kappaPairs);
  const health = kappaHealthLabel(kappa);

  const measurable = aspects.filter((a) => a.measured && a.score !== null);
  const queueTotal = await prisma.submission.count({
    where: { submittedAt: { not: null }, session: { createdById: session!.user.id } },
  });
  const queueDone = await prisma.submission.count({
    where: {
      submittedAt: { not: null },
      session: { createdById: session!.user.id },
      scores: { some: { teacherReviews: { some: {} } } },
    },
  });

  return (
    <div>
      <p className="crumb">
        {queueDone} DARI {queueTotal} SUDAH DITINJAU · {submission.session.label.toUpperCase()}
      </p>
      <h2 className="h2">{submission.student.name}</h2>
      <p className="sub">
        Mesin sudah mengusulkan skor. Setujui atau koreksi.{" "}
        <span className={`pill ${reviewByAspect.size > 0 ? "pill-ok" : "pill-mark"}`}>
          {reviewByAspect.size > 0 ? "SUDAH DITINJAU" : "BELUM DITINJAU"}
        </span>
      </p>

      {(submission.session.readingTextId || submission.session.audioMaterialId) && (
        <div className="card" style={{ marginBottom: 16, display: "flex", gap: 24 }}>
          {submission.session.readingTextId && (
            <div>
              <p className="tbl-k" style={{ margin: 0 }}>
                MEMBACA
              </p>
              <p style={{ fontSize: 14 }}>
                {submission.readingCorrect ?? 0}/{submission.readingTotal ?? 0} benar
              </p>
            </div>
          )}
          {submission.session.audioMaterialId && (
            <div>
              <p className="tbl-k" style={{ margin: 0 }}>
                MENYIMAK
              </p>
              <p style={{ fontSize: 14 }}>
                {submission.listeningCorrect ?? 0}/{submission.listeningTotal ?? 0} benar · audio diulang{" "}
                {submission.audioPlays}×
              </p>
            </div>
          )}
        </div>
      )}

      <div className="rev">
        <div className="rev-img">
          {submission.artifacts[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={submission.artifacts[0].originalPath} alt="Lembar jawaban siswa" />
          ) : (
            <p style={{ fontSize: 13, color: "var(--graphite)" }}>Tidak ada foto.</p>
          )}
        </div>

        <ReviewPanel
          submissionId={submissionId}
          scoreId={score.id}
          aspects={measurable}
          existingReviews={Object.fromEntries(score.teacherReviews.map((r) => [r.aspect, r.teacherValue]))}
          writingContent={score.writingContent}
          kappa={kappa}
          kappaLabel={health.label}
          kappaTone={health.tone}
          kappaSampleN={allReviews.length}
        />
      </div>
    </div>
  );
}
