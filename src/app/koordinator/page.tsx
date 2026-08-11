import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cohensKappa, kappaHealthLabel, scoreBand } from "@/lib/kappa";

export default async function RingkasanPage() {
  const session = await auth();
  const schoolId = session!.user.schoolId;

  const [studentCount, pendingConsent, openSessions, submittedCount, allReviews, readingQueue, readingPublished, openTickets] =
    await Promise.all([
      prisma.student.count({ where: { schoolId, archivedAt: null } }),
      prisma.student.count({ where: { schoolId, consentStatus: "PENDING" } }),
      prisma.session.count({ where: { class: { schoolId }, status: "OPEN" } }),
      prisma.submission.count({ where: { student: { schoolId }, submittedAt: { not: null } } }),
      prisma.teacherReview.findMany({ where: { score: { submission: { student: { schoolId } } } } }),
      prisma.submission.count({
        where: {
          student: { schoolId },
          submittedAt: { not: null },
          artifacts: { some: {} },
          characterReading: null,
        },
      }),
      prisma.characterReading.count({ where: { submission: { student: { schoolId } }, status: "PUBLISHED" } }),
      prisma.consultTicket.count({ where: { student: { schoolId }, status: "OPEN" } }),
    ]);

  const kappa = cohensKappa(allReviews.map((r) => [scoreBand(r.machineValue), scoreBand(r.teacherValue)]));
  const health = kappaHealthLabel(kappa);

  return (
    <div>
      <p className="crumb">KOORDINATOR</p>
      <h2 className="h2">Ringkasan program</h2>
      <p className="sub">SMP Negeri 27 Malang · Tahun ajaran berjalan.</p>

      <div className="metrics">
        <div className="metric">
          <p className="metric-k">SISWA AKTIF</p>
          <p className="metric-v">{studentCount}</p>
          <p className="metric-d">{pendingConsent} menunggu persetujuan wali</p>
        </div>
        <div className="metric">
          <p className="metric-k">SESI TERBUKA</p>
          <p className="metric-v">{openSessions}</p>
        </div>
        <div className="metric">
          <p className="metric-k">LEMBAR TERKUMPUL</p>
          <p className="metric-v">{submittedCount}</p>
        </div>
        <div className="metric">
          <p className="metric-k">κ MESIN-GURU</p>
          <p className="metric-v">{kappa === null ? "-" : kappa.toFixed(2)}</p>
          <p className={`metric-d ${health.tone === "bad" ? "down" : health.tone === "ok" ? "up" : ""}`}>
            {health.label}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/koordinator/indikator" className="btn btn-sm">
          Lihat 15 indikator jurnal
        </Link>
        <Link href="/koordinator/siswa" className="btn btn-ghost btn-sm">
          Tinjau persetujuan wali ({pendingConsent})
        </Link>
        <Link href="/koordinator/materi" className="btn btn-ghost btn-sm">
          Kelola bank materi
        </Link>
      </div>

      <p className="tbl-k" style={{ marginTop: 32 }}>
        LAYANAN PEMBACAAN KARAKTER &amp; KONSULTASI (Guru BK)
      </p>
      <p className="hint" style={{ marginBottom: 12 }}>
        Hanya ringkasan agregat. Isi pembacaan per siswa bersifat pribadi dan tidak dapat dibuka
        dari sini.
      </p>
      <div className="metrics">
        <div className="metric">
          <p className="metric-k">MENUNGGU DIBACA</p>
          <p className="metric-v">{readingQueue}</p>
        </div>
        <div className="metric">
          <p className="metric-k">SUDAH TERBIT</p>
          <p className="metric-v">{readingPublished}</p>
        </div>
        <div className="metric">
          <p className="metric-k">TIKET TERBUKA</p>
          <p className="metric-v">{openTickets}</p>
        </div>
      </div>
    </div>
  );
}
