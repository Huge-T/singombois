import { prisma } from "@/lib/prisma";

const ACTION_LABEL: Record<string, string> = {
  RESET_STUDENT_PIN: "Atur ulang PIN siswa",
  REVOKE_CONSENT_DELETE_ARTIFACTS: "Siswa mencabut persetujuan & menghapus unggahan",
  VIEW_CHARACTER_READING_SOURCE: "Guru BK membuka lembar siswa",
  DRAFT_CHARACTER_READING: "Guru BK menyimpan draf pembacaan karakter",
  PUBLISH_CHARACTER_READING: "Guru BK memublikasikan pembacaan karakter",
  REPLY_CONSULT_TICKET: "Guru BK membalas tiket konsultasi",
  APPROVE_FEEDBACK: "Koordinator menayangkan tanggapan siswa",
  UNAPPROVE_FEEDBACK: "Koordinator menurunkan tanggapan siswa",
  VIEW_FINAL_CONCLUSION_RECAP: "Guru BK membuka rekap kesimpulan siswa",
  DRAFT_FINAL_CONCLUSION: "Guru BK menyimpan draf kesimpulan akhir",
  PUBLISH_FINAL_CONCLUSION: "Guru BK memublikasikan kesimpulan akhir",
  DRAFT_KOKURIKULER_READING: "Menyimpan draf analisis kepribadian kokurikuler",
  PUBLISH_KOKURIKULER_READING: "Memublikasikan analisis kepribadian kokurikuler",
};

export default async function LogAksesPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: true },
  });

  return (
    <div>
      <p className="crumb">KOORDINATOR</p>
      <h2 className="h2">Log akses</h2>
      <p className="sub">Jejak aksi sensitif: reset PIN, pencabutan persetujuan, ekspor data (PRIV-9).</p>

      <table className="ind">
        <thead>
          <tr>
            <th>WAKTU</th>
            <th>AKTOR</th>
            <th>AKSI</th>
            <th>ENTITAS</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td style={{ fontFamily: "var(--data)", fontSize: 11.5 }}>
                {l.createdAt.toLocaleString("id-ID")}
              </td>
              <td>{l.user?.name ?? (l.actorType === "student" ? "Siswa" : "Sistem")}</td>
              <td>{ACTION_LABEL[l.action] ?? l.action}</td>
              <td style={{ fontSize: 12, color: "var(--ink-2)" }}>
                {l.entity} {l.entityId ? `· ${l.entityId.slice(0, 8)}…` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {logs.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 12 }}>Belum ada aksi sensitif tercatat.</p>
      )}
    </div>
  );
}
