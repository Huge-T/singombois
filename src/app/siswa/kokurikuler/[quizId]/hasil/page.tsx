import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface IndicationItem {
  dimension: string;
  title: string;
  detail: string;
}

const TYPE_LABEL: Record<string, string> = {
  PILIHAN_GANDA: "Pilihan ganda",
  BENAR_SALAH: "Benar-salah",
  URAIAN: "Uraian",
};

export default async function SiswaKokurikulerHasilPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const session = await auth();
  const student = await prisma.student.findUnique({ where: { id: session!.user.id } });
  if (!student) redirect("/masuk");

  const quiz = await prisma.kokurikulerQuiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!quiz || quiz.classId !== student.classId) redirect("/siswa/kokurikuler");

  const attempt = await prisma.kokurikulerAttempt.findUnique({
    where: { quizId_studentId: { quizId, studentId: student.id } },
    include: {
      answers: { include: { artifact: { include: { featureSet: true } } } },
      reading: { include: { reader: true } },
    },
  });
  if (!attempt || !attempt.submittedAt) redirect(`/siswa/kokurikuler/${quizId}`);

  const answerByQuestionId = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const uraianAnswers = attempt.answers.filter((a) => a.artifact?.accepted);
  const reading = attempt.reading?.status === "PUBLISHED" ? attempt.reading : null;

  return (
    <div>
      <p className="crumb">KOKURIKULER · {quiz.label.toUpperCase()}</p>
      <h2 className="h2">Hasil kuis</h2>
      <p className="sub">
        Dikumpulkan {attempt.submittedAt.toLocaleString("id-ID")}
      </p>

      <div className="metrics" style={{ marginBottom: 24 }}>
        <div className="metric">
          <p className="metric-k">OBJEKTIF</p>
          <p className="metric-v">{attempt.autoTotal ? `${attempt.autoCorrect}/${attempt.autoTotal}` : "-"}</p>
          <p className="metric-d">pilihan ganda &amp; benar-salah</p>
        </div>
        <div className="metric">
          <p className="metric-k">ESAI</p>
          <p className="metric-v">{attempt.essayScore ?? "-"}</p>
          <p className="metric-d">{attempt.essayScore !== null ? "dinilai guru" : "menunggu penilaian guru"}</p>
        </div>
        <div className="metric">
          <p className="metric-k">NILAI AKHIR</p>
          <p className="metric-v">{attempt.finalScore ?? "-"}</p>
          <p className="metric-d">{attempt.finalScore !== null ? "final" : "menunggu nilai esai"}</p>
        </div>
      </div>

      <p className="tbl-k">JAWABAN</p>
      <div className="card" style={{ marginBottom: 24 }}>
        {quiz.questions.map((q) => {
          const answer = answerByQuestionId.get(q.id);
          return (
            <div className="rev-item" key={q.id}>
              <p>
                <strong>
                  {q.order}. {q.text}
                </strong>{" "}
                <span className="hint">({TYPE_LABEL[q.type]})</span>
              </p>
              {q.type !== "URAIAN" && (
                <p>
                  Jawabanmu: <strong>{answer?.answerText || "-"}</strong>{" "}
                  {answer?.isCorrect === true && <span className="pill pill-ok">Benar</span>}
                  {answer?.isCorrect === false && <span className="pill">Salah</span>}
                </p>
              )}
              {q.type === "URAIAN" && answer?.artifact?.accepted && (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={answer.artifact.originalPath}
                    alt={`Foto jawaban soal ${q.order}`}
                    style={{ maxWidth: 280, border: "1px solid var(--garis)", borderRadius: 4 }}
                  />
                  {answer.artifact.kind === "TULISAN" && answer.artifact.featureSet?.writingQuality != null && (
                    <p className="hint" style={{ marginTop: 6 }}>
                      Kualitas tulisan (grafologi): <strong>{Math.round(answer.artifact.featureSet.writingQuality)}</strong>
                    </p>
                  )}
                  {answer.artifact.kind === "GAMBAR" && (
                    <p className="hint" style={{ marginTop: 6 }}>
                      Gambar dibaca langsung oleh tim ahli, tanpa skor kerapian teknis.
                    </p>
                  )}
                </div>
              )}
              {q.type === "URAIAN" && !answer?.artifact?.accepted && <p className="hint">Belum ada foto jawaban.</p>}
            </div>
          );
        })}
      </div>

      {uraianAnswers.length > 0 && (
        <p className="hint" style={{ marginBottom: 24 }}>
          Skor grafologi di atas mengukur kerapian teknis tulisan tangan (bukan isi jawaban) — sama seperti
          yang dipakai di sesi literasi.
        </p>
      )}

      {reading ? (
        <div className="card">
          <p className="tbl-k">ANALISIS KEPRIBADIAN</p>
          {(JSON.parse(reading.indicationsJson) as IndicationItem[]).map((ind, i) => (
            <div key={i} className="rev-item">
              <p>
                <strong>{ind.title}</strong> <span className="hint">({ind.dimension})</span>
              </p>
              <p>{ind.detail}</p>
            </div>
          ))}
          <p>{reading.narrative}</p>
          <p className="hint">
            Ditulis oleh {reading.reader.name}
            {reading.publishedAt ? ` · terbit ${reading.publishedAt.toLocaleDateString("id-ID")}` : ""}
          </p>
        </div>
      ) : (
        <div className="card">
          <p className="hint">Analisis kepribadian belum diterbitkan gurumu.</p>
        </div>
      )}
    </div>
  );
}
