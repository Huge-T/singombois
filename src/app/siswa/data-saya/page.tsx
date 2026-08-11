import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RevokeButton } from "./RevokeButton";

const CONSENT_LABEL: Record<string, string> = {
  GRANTED: "Disetujui wali murid",
  PENDING: "Menunggu persetujuan wali murid",
  REVOKED: "Dicabut, unggahan lama telah dihapus",
};

export default async function DataSayaPage() {
  const session = await auth();
  const student = await prisma.student.findUnique({
    where: { id: session!.user.id },
    include: {
      class: true,
      finalConclusion: true,
      submissions: {
        include: { session: { select: { label: true } }, scores: true, artifacts: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!student) return null;

  const conclusion = student.finalConclusion?.status === "PUBLISHED" ? student.finalConclusion : null;

  return (
    <div>
      <p className="crumb">SISWA · PRIVASI</p>
      <h2 className="h2">Data tentang saya</h2>
      <p className="sub">Semua data yang tersimpan tentang kamu di SINGO MBOIS (PRIV-7).</p>

      <div className="card" style={{ marginBottom: 20 }}>
        <p className="tbl-k">PROFIL</p>
        <p style={{ fontSize: 14 }}>{student.name}</p>
        <p style={{ fontSize: 13, color: "var(--ink-2)" }}>
          NISN {student.nisn} · Kelas {student.class.name}
        </p>
        <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
          Status persetujuan: <b>{CONSENT_LABEL[student.consentStatus]}</b>
        </p>
      </div>

      {conclusion && (
        <div className="card" style={{ marginBottom: 20, borderTop: "3px solid var(--singo)" }}>
          <p className="tbl-k">KESIMPULAN AKHIR DARI GURU BK</p>
          <p style={{ fontSize: 14.5, lineHeight: 1.75, whiteSpace: "pre-line" }}>{conclusion.body}</p>
          <p className="hint" style={{ marginTop: 10 }}>
            Disusun Guru BK dari hasil ketiga level tes Gestalt yang sudah kamu selesaikan
            {conclusion.publishedAt ? `, terbit ${conclusion.publishedAt.toLocaleDateString("id-ID")}` : ""}.
            Ada yang mau didiskusikan? Buka tiket konsultasi atau temui Guru BK langsung.
          </p>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <p className="tbl-k">RIWAYAT SESI ({student.submissions.length})</p>
        {student.submissions.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--ink-2)" }}>Belum ada sesi yang dikerjakan.</p>
        )}
        {student.submissions.map((s) => (
          <div key={s.id} className="row">
            <span className="row-n">{s.session.label}</span>
            <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
              {s.artifacts.length} foto · {s.scores.length} skor
            </span>
            <span className="row-v">{s.submittedAt ? s.submittedAt.toLocaleDateString("id-ID") : "belum kirim"}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a href="/api/data-saya/export" className="btn btn-ghost btn-sm">
          Unduh semua data saya (JSON)
        </a>
        {student.consentStatus === "GRANTED" && <RevokeButton />}
      </div>
    </div>
  );
}
