import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApproveToggle } from "./ApproveToggle";
import { ParentReviewToggle } from "./ParentReviewToggle";

const AWARENESS_LABEL: Record<string, string> = {
  TAHU: "Sudah tahu grafologi",
  PERNAH_DENGAR: "Pernah dengar",
  TIDAK_TAHU: "Tidak tahu sama sekali",
};

const CONSENT_LABEL: Record<string, string> = {
  DENGAN_NAMA: "Boleh, dengan nama",
  ANONIM: "Boleh, anonim",
  TIDAK: "Tidak boleh tampil",
};

export default async function TanggapanPage() {
  const session = await auth();
  const schoolId = session!.user.schoolId;

  const feedbacks = await prisma.feedback.findMany({
    where: { student: { schoolId } },
    include: { student: { include: { class: true } } },
    orderBy: { createdAt: "desc" },
  });

  const avgClarity =
    feedbacks.length > 0
      ? (feedbacks.reduce((s, f) => s + f.clarityScore, 0) / feedbacks.length).toFixed(1)
      : "-";
  const shown = feedbacks.filter((f) => f.approved).length;

  const parentReviews = await prisma.parentReview.findMany({ orderBy: { createdAt: "desc" } });
  const pendingParentReviews = parentReviews.filter((r) => !r.approved).length;

  return (
    <div>
      <p className="crumb">KOORDINATOR</p>
      <h2 className="h2">Ulasan siswa</h2>
      <p className="sub">
        Ulasan &amp; rating setelah siswa mencoba SINGO MBOIS. Ulasan yang kamu setujui tampil di
        beranda; saran perbaikan hanya dibaca di sini dan tidak pernah tayang.
      </p>

      <div className="metrics">
        <div className="metric">
          <p className="metric-k">TANGGAPAN MASUK</p>
          <p className="metric-v">{feedbacks.length}</p>
        </div>
        <div className="metric">
          <p className="metric-k">RATA-RATA PAHAM (1-5)</p>
          <p className="metric-v">{avgClarity}</p>
        </div>
        <div className="metric">
          <p className="metric-k">TAMPIL DI BERANDA</p>
          <p className="metric-v">{shown}</p>
        </div>
      </div>

      {feedbacks.length === 0 && (
        <p style={{ fontSize: 14, color: "var(--tinta-lembut)" }}>
          Belum ada tanggapan. Angket muncul di halaman hasil sesi tiap siswa.
        </p>
      )}

      {feedbacks.map((f) => (
        <div className="card" key={f.id} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap", marginBottom: 8 }}>
            <b style={{ fontSize: 14.5 }}>{f.student.name}</b>
            <span style={{ fontSize: 12.5, color: "var(--tinta-lembut)" }}>{f.student.class.name}</span>
            <span className="pill pill-singo">{"★".repeat(f.clarityScore)}{"☆".repeat(5 - f.clarityScore)}</span>
            <span className="pill pill-graphite">{AWARENESS_LABEL[f.awareness]}</span>
            <span className={`pill ${f.displayConsent === "TIDAK" ? "pill-mark" : "pill-ok"}`}>
              {CONSENT_LABEL[f.displayConsent]}
            </span>
            {f.approved && <span className="pill pill-ok">TAYANG</span>}
          </div>

          <p style={{ fontSize: 14, lineHeight: 1.65, marginBottom: 8 }}>{f.impression}</p>
          {f.suggestion && (
            <p style={{ fontSize: 13, color: "var(--tinta-lembut)", marginBottom: 12 }}>
              Saran (internal): {f.suggestion}
            </p>
          )}

          <ApproveToggle feedbackId={f.id} approved={f.approved} consentAllows={f.displayConsent !== "TIDAK"} />
        </div>
      ))}

      <h2 className="h2" style={{ marginTop: 40 }}>
        Ulasan orang tua {pendingParentReviews > 0 && <span className="pill pill-mark">{pendingParentReviews} MENUNGGU</span>}
      </h2>
      <p className="sub">
        Ulasan publik dari orang tua/wali murid (tanpa login) di beranda. Wajib disetujui dulu
        sebelum tayang — hapus kalau spam/tidak relevan.
      </p>

      {parentReviews.length === 0 && (
        <p style={{ fontSize: 14, color: "var(--tinta-lembut)" }}>Belum ada ulasan orang tua.</p>
      )}

      {parentReviews.map((r) => (
        <div className="card" key={r.id} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap", marginBottom: 8 }}>
            <b style={{ fontSize: 14.5 }}>{r.name}</b>
            <span className="pill pill-singo">
              {"★".repeat(r.rating)}
              {"☆".repeat(5 - r.rating)}
            </span>
            <span style={{ fontSize: 12, color: "var(--tinta-lembut)" }}>{r.createdAt.toLocaleDateString("id-ID")}</span>
            {r.approved && <span className="pill pill-ok">TAYANG</span>}
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.65, marginBottom: 8 }}>{r.comment}</p>
          <ParentReviewToggle reviewId={r.id} approved={r.approved} />
        </div>
      ))}
    </div>
  );
}
