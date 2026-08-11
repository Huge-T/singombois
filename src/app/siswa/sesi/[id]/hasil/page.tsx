import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AspectScore } from "@/lib/rubric";
import type { RawFeatures } from "@/lib/analysis";
import { GESTALT_DISCLAIMER, GESTALT_VERSION, TEKANAN_INFO, interpretGestalt } from "@/lib/gestalt";
import type { StrengthItem } from "@/app/bk/[submissionId]/actions";
import { CONTACTS } from "@/content/team";
import { AskExpertButton } from "./AskExpertButton";

function fmtRaw(a: AspectScore) {
  if (a.rawValue === null) return "tak terukur";
  const v = a.unit === "%" || a.unit === "mm" ? a.rawValue.toFixed(1) : a.rawValue.toFixed(2);
  return `${v}${a.unit === "x" ? "×" : a.unit === "%" ? "%" : ` ${a.unit}`}`;
}

export default async function HasilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const student = await prisma.student.findUnique({ where: { id: session!.user.id } });
  if (!student) redirect("/masuk");

  const literacySession = await prisma.session.findUnique({ where: { id } });
  if (!literacySession) redirect("/siswa");

  const submission = await prisma.submission.findUnique({
    where: { sessionId_studentId: { sessionId: id, studentId: student.id } },
    include: {
      scores: { orderBy: { createdAt: "desc" }, take: 1, include: { teacherReviews: true } },
      artifacts: { orderBy: { createdAt: "desc" }, take: 1, include: { featureSet: true } },
      characterReading: true,
      feedbacks: true,
    },
  });

  if (!submission || !submission.submittedAt) redirect(`/siswa/sesi/${id}`);

  const reading = submission.characterReading?.status === "PUBLISHED" ? submission.characterReading : null;
  const strengths: StrengthItem[] = reading ? JSON.parse(reading.strengthsJson) : [];
  const waHotline = CONTACTS.whatsapp[0];

  // Indikasi Gestalt: dihitung ulang dari fitur tersimpan (reproducible), hanya
  // untuk sesi Gestalt dengan artefak tulisan yang punya FeatureSet.
  const latestArtifact = submission.artifacts[0];
  const gestaltResults =
    literacySession.storyPromptId && latestArtifact?.kind === "TULISAN" && latestArtifact.featureSet
      ? interpretGestalt(JSON.parse(latestArtifact.featureSet.featuresJson) as RawFeatures)
      : null;

  const score = submission.scores[0];
  const aspects: AspectScore[] = score ? JSON.parse(score.aspectsJson) : [];
  const reviewByAspect = new Map(score?.teacherReviews.map((r) => [r.aspect, r]) ?? []);
  const reviewed = reviewByAspect.size > 0;

  const measured = aspects.filter((a) => a.measured);
  const focus = measured.length
    ? measured.reduce((worst, a) => ((a.score as number) < (worst.score as number) ? a : worst))
    : null;
  const focusAssignment = focus
    ? await prisma.exerciseAssignment.findFirst({
        where: { studentId: student.id, reasonAspect: focus.key },
        orderBy: { assignedAt: "desc" },
        include: { module: true },
      })
    : null;

  const displayScore = (a: AspectScore) => {
    const review = reviewByAspect.get(a.key);
    return review ? review.teacherValue : a.score;
  };

  return (
    <div>
      <p className="crumb">SESI · {literacySession.label.toUpperCase()}</p>
      <h2 className="h2">Hasil sesimu</h2>
      <p className="sub">
        Diperiksa mesin{reviewed ? ", ditinjau guru" : ""}.{" "}
        <span className={`pill ${reviewed ? "pill-ok" : "pill-graphite"}`}>
          {reviewed ? "DITINJAU GURU" : "MENUNGGU TINJAUAN"}
        </span>
      </p>

      <p className="tbl-k">PEMBACAAN POTENSI (Guru BK)</p>
      {reading ? (
        <div className="card" style={{ marginBottom: 28 }}>
          {strengths.map((s, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <h4 style={{ fontFamily: "var(--display)", fontSize: 16, marginBottom: 4 }}>{s.title}</h4>
              <p style={{ fontSize: 14, color: "var(--tinta-lembut)", lineHeight: 1.6 }}>{s.detail}</p>
            </div>
          ))}
          <p className="tbl-k" style={{ marginTop: 18 }}>
            SARAN CARA BELAJAR
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 18 }}>{reading.learningSuggestions}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <AskExpertButton submissionId={submission.id} sessionLabel={literacySession.label} />
            <a className="btn btn-ghost btn-sm" href={waHotline.url} target="_blank" rel="noreferrer">
              Hotline WhatsApp
            </a>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 14, color: "var(--tinta-lembut)" }}>
            Lembarmu sedang dibaca tim ahli SINGO MBOIS, dengan fokus pada potensi positifmu.
            Hasilnya akan muncul di sini begitu selesai.
          </p>
          <div style={{ marginTop: 14 }}>
            <a className="btn btn-ghost btn-sm" href={waHotline.url} target="_blank" rel="noreferrer">
              Hotline WhatsApp
            </a>
          </div>
        </div>
      )}

      {gestaltResults && (
        <>
          <p className="tbl-k">
            INDIKASI KARAKTER (GRAFOLOGI GESTALT){" "}
            <span className={`pill ${reading ? "pill-ok" : "pill-singo"}`}>
              {reading ? "SUDAH DIVALIDASI GURU BK" : "INDIKASI AWAL · MENUNGGU VALIDASI GURU BK"}
            </span>
          </p>
          <div className="kisi" style={{ marginBottom: 12 }}>
            {gestaltResults.map((g) =>
              g.measured ? (
                <div className="kartu" key={g.variable}>
                  <p
                    style={{
                      fontFamily: "var(--data)",
                      fontSize: 11,
                      letterSpacing: "0.06em",
                      color: "var(--tinta-lembut)",
                      marginBottom: 6,
                    }}
                  >
                    {g.variableLabel.toUpperCase()} · {g.category.toUpperCase()} (
                    {g.variable === "kemiringan" ? `${g.rawValue > 0 ? "+" : ""}${g.rawValue.toFixed(0)}` : g.rawValue.toFixed(1)}
                    {g.unit === "°" ? "°" : ` ${g.unit}`})
                  </p>
                  <h3>{g.title}</h3>
                  <p>{g.description}</p>
                  <p style={{ fontSize: 12.5, color: "var(--tinta-lembut)", marginTop: 8 }}>{g.saran}</p>
                </div>
              ) : (
                <div className="kartu" key={g.variable}>
                  <h3>{g.variableLabel}</h3>
                  <p>{g.reason}</p>
                </div>
              )
            )}
          </div>
          <p className="hint" style={{ marginBottom: 6 }}>
            {GESTALT_DISCLAIMER} ({GESTALT_VERSION})
          </p>
          <p className="hint" style={{ marginBottom: 24 }}>
            {TEKANAN_INFO}
          </p>
        </>
      )}

      <p className="tbl-k">SKOR LITERASI TEKNIS (ditinjau wali kelas)</p>
      <div className="metrics">
        <div className="metric">
          <p className="metric-k">MEMBACA</p>
          <p className="metric-v">{score?.reading ?? "-"}</p>
          <p className="metric-d">
            {submission.readingCorrect}/{submission.readingTotal} benar
          </p>
        </div>
        <div className="metric">
          <p className="metric-k">MENYIMAK</p>
          <p className="metric-v">{score?.listening ?? "-"}</p>
          <p className="metric-d">audio diulang {submission.audioPlays}×</p>
        </div>
        <div className="metric">
          <p className="metric-k">MENULIS · ISI</p>
          <p className="metric-v">{score?.writingContent ?? "-"}</p>
          <p className="metric-d">{score?.writingContent ? "dinilai guru" : "menunggu penilaian guru"}</p>
        </div>
        <div className="metric">
          <p className="metric-k">MENULIS · KUALITAS</p>
          <p className="metric-v">{score?.writingQuality ?? "-"}</p>
          <p className="metric-d">rubrik {score?.rubricVersion}</p>
        </div>
      </div>

      <p className="tbl-k">RINCIAN KUALITAS TULISAN</p>
      {aspects.map((a) => {
        const val = displayScore(a);
        const weak = a.measured && (val as number) < 60;
        return (
          <div className={`row ${a.measured ? "" : "dim"}`} key={a.key}>
            <span className="row-n">{a.label}</span>
            <span className="bar">{a.measured && <i className={weak ? "w" : ""} style={{ width: `${val}%` }} />}</span>
            <span className={`row-v ${weak ? "w" : ""}`}>{a.measured ? fmtRaw(a) : "tak terukur"}</span>
          </div>
        );
      })}

      {focus && focusAssignment && (
        <div className="focus">
          <p className="focus-k">FOKUS MINGGU INI · SATU SAJA</p>
          <h4>{focusAssignment.module.title}</h4>
          <p>{focusAssignment.module.description}</p>
          <span className="btn btn-mark" style={{ cursor: "default" }}>
            Latihan {focusAssignment.module.durationMin} menit
          </span>
        </div>
      )}

      {submission.artifacts[0] && (
        <div className="foot-note">
          <span>KALIBRASI: {submission.artifacts[0].calibrationMethod === "ruled_line" ? "GARIS BERGARIS TERDETEKSI" : "TIDAK TERSEDIA"}</span>
          <span>RUBRIK {score?.rubricVersion?.toUpperCase()}</span>
        </div>
      )}

      <div className="card" style={{ marginTop: 28 }}>
        {submission.feedbacks.length > 0 ? (
          <>
            <h4 style={{ fontFamily: "var(--display)", fontSize: 16, marginBottom: 6 }}>
              Terima kasih, tanggapanmu sudah masuk.
            </h4>
            <p style={{ fontSize: 13.5, color: "var(--tinta-lembut)", marginBottom: 12 }}>
              Jawabanmu dibaca tim SINGO MBOIS. Kalau ada yang mau diubah, kamu bisa memperbaruinya.
            </p>
            <Link href={`/siswa/sesi/${id}/angket`} className="btn btn-ghost btn-sm">
              Ubah tanggapan
            </Link>
          </>
        ) : (
          <>
            <h4 style={{ fontFamily: "var(--display)", fontSize: 16, marginBottom: 6 }}>
              Sudah ikut? Ceritakan pengalamanmu.
            </h4>
            <p style={{ fontSize: 13.5, color: "var(--tinta-lembut)", marginBottom: 12 }}>
              Lima pertanyaan, sekitar dua menit. Boleh pakai nama, boleh tanpa nama, kamu yang
              pilih di formulirnya.
            </p>
            <Link href={`/siswa/sesi/${id}/angket`} className="btn btn-sm">
              Isi angket
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
