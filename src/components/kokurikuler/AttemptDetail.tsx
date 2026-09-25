import type { KokurikulerQuestionType } from "@prisma/client";
import { summarizeKokurikulerPersonalityPattern } from "@/lib/kokurikulerPersonality";

const TYPE_LABEL: Record<KokurikulerQuestionType, string> = {
  PILIHAN_GANDA: "Pilihan ganda",
  BENAR_SALAH: "Benar-salah",
  URAIAN: "Uraian",
};

const OPTION_LETTERS = ["A", "B", "C", "D"];

interface QuestionForDetail {
  id: string;
  order: number;
  type: KokurikulerQuestionType;
  text: string;
  optionsJson: string | null;
  correctAnswer: string | null;
  personalityDimension: string | null;
}

interface ArtifactForDetail {
  kind: "TULISAN" | "GAMBAR";
  originalPath: string;
  accepted: boolean;
  qualityFlags: string;
  featureSet: { writingQuality: number | null } | null;
}

interface AnswerForDetail {
  questionId: string;
  answerText: string | null;
  isCorrect: boolean | null;
  artifact: ArtifactForDetail | null;
}

interface ReadingForDetail {
  status: "DRAFT" | "PUBLISHED";
  indicationsJson: string;
  narrative: string;
  reader: { name: string };
  publishedAt: Date | null;
}

interface IndicationItem {
  dimension: string;
  title: string;
  detail: string;
}

export function AttemptDetail({
  questions,
  attempt,
  showDraftReading,
}: {
  questions: QuestionForDetail[];
  attempt: {
    student: { name: string; nisn: string };
    submittedAt: Date | null;
    autoCorrect: number | null;
    autoTotal: number | null;
    essayScore: number | null;
    essayGradedBy: { name: string } | null;
    finalScore: number | null;
    answers: AnswerForDetail[];
    reading: ReadingForDetail | null;
  };
  showDraftReading: boolean;
}) {
  const answerByQuestionId = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const pattern = summarizeKokurikulerPersonalityPattern(questions, attempt.answers);

  return (
    <div>
      <p className="crumb">
        {attempt.student.name} · {attempt.student.nisn}
      </p>
      <p className="sub">
        {attempt.submittedAt ? `Dikumpulkan ${attempt.submittedAt.toLocaleString("id-ID")}` : "Belum dikumpulkan"} ·
        Objektif {attempt.autoTotal ? `${attempt.autoCorrect}/${attempt.autoTotal}` : "-"} · Esai{" "}
        {attempt.essayScore !== null ? attempt.essayScore : "belum dinilai"} · Nilai akhir{" "}
        {attempt.finalScore !== null ? attempt.finalScore : "menunggu"}
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="tbl-k">JAWABAN</p>
        {questions.map((q) => {
          const answer = answerByQuestionId.get(q.id);
          const options: string[] = q.optionsJson ? JSON.parse(q.optionsJson) : [];
          return (
            <div className="rev-item" key={q.id}>
              <p>
                <strong>
                  {q.order}. {q.text}
                </strong>{" "}
                <span className="hint">
                  ({TYPE_LABEL[q.type]}
                  {q.personalityDimension ? ` · ${q.personalityDimension}` : ""})
                </span>
              </p>
              {q.type === "PILIHAN_GANDA" && (
                <ul>
                  {options.map((opt, i) => (
                    <li key={i}>
                      {OPTION_LETTERS[i]}. {opt}
                      {q.correctAnswer === OPTION_LETTERS[i] ? " (kunci)" : ""}
                    </li>
                  ))}
                </ul>
              )}
              {q.type === "URAIAN" && answer?.artifact ? (
                <div>
                  <p className="hint">
                    Foto jawaban ({answer.artifact.kind === "GAMBAR" ? "gambar" : "tulisan"}){" "}
                    {answer.artifact.accepted ? "(lolos cek kualitas)" : "(DITOLAK cek kualitas — foto tidak layak dianalisis)"}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={answer.artifact.originalPath}
                    alt={`Foto jawaban uraian soal ${q.order}`}
                    style={{ maxWidth: 360, border: "1px solid var(--garis)", borderRadius: 4 }}
                  />
                  {answer.artifact.featureSet?.writingQuality != null && (
                    <p className="hint" style={{ marginTop: 6 }}>
                      Kualitas tulisan (grafologi): <strong>{Math.round(answer.artifact.featureSet.writingQuality)}</strong>
                    </p>
                  )}
                </div>
              ) : q.type === "URAIAN" ? (
                <p>Jawaban siswa: <strong>{answer?.answerText || "-"}</strong></p>
              ) : (
                <p>
                  Jawaban siswa: <strong>{answer?.answerText || "-"}</strong>{" "}
                  {answer?.isCorrect === true && <span className="pill pill-ok">Benar</span>}
                  {answer?.isCorrect === false && <span className="pill">Salah</span>}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="tbl-k">POLA JAWABAN PER DIMENSI (MEKANIS, BUKAN DIAGNOSIS)</p>
        {pattern.dimensionTallies.length === 0 && pattern.essayNotes.length === 0 && (
          <p className="hint">Tidak ada soal bertag dimensi kepribadian di kuis ini.</p>
        )}
        {pattern.dimensionTallies.map((t) => (
          <p key={t.dimension}>
            {t.dimension}: {t.correct}/{t.total} benar ({t.pct}%)
          </p>
        ))}
        {pattern.essayNotes.length > 0 && (
          <>
            <p className="tbl-k" style={{ marginTop: 12 }}>
              KUTIPAN JAWABAN URAIAN
            </p>
            {pattern.essayNotes.map((n, i) => (
              <blockquote key={i} style={{ marginBottom: 8 }}>
                <span className="hint">{n.dimension ?? "Umum"}</span> — {n.questionText}
                <br />
                &ldquo;{n.answerText}&rdquo;
              </blockquote>
            ))}
          </>
        )}
        <p className="hint" style={{ marginTop: 8 }}>
          {pattern.disclaimer}
        </p>
      </div>

      {attempt.reading?.status === "PUBLISHED" ? (
        <div className="card">
          <p className="tbl-k">ANALISIS KEPRIBADIAN (TERBIT)</p>
          {(JSON.parse(attempt.reading.indicationsJson) as IndicationItem[]).map((ind, i) => (
            <div key={i} className="rev-item">
              <p>
                <strong>{ind.title}</strong> <span className="hint">({ind.dimension})</span>
              </p>
              <p>{ind.detail}</p>
            </div>
          ))}
          <p>{attempt.reading.narrative}</p>
          <p className="hint">
            Ditulis oleh {attempt.reading.reader.name}
            {attempt.reading.publishedAt ? ` · terbit ${attempt.reading.publishedAt.toLocaleDateString("id-ID")}` : ""}
          </p>
        </div>
      ) : attempt.reading?.status === "DRAFT" && showDraftReading ? (
        <div className="card">
          <p className="tbl-k">ANALISIS KEPRIBADIAN (DRAF, BELUM TERBIT)</p>
          <p className="hint">Draf oleh {attempt.reading.reader.name}, belum terlihat siswa/koordinator.</p>
        </div>
      ) : (
        <p className="hint">Analisis kepribadian belum diterbitkan.</p>
      )}
    </div>
  );
}
