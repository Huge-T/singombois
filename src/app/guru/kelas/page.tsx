import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResetPinButton } from "./ResetPinButton";

const CONSENT_LABEL: Record<string, { label: string; tone: string }> = {
  GRANTED: { label: "DISETUJUI", tone: "pill-ok" },
  PENDING: { label: "MENUNGGU", tone: "pill-mark" },
  REVOKED: { label: "DICABUT", tone: "pill-mark" },
};

export default async function KelasPage() {
  const session = await auth();
  const classes = await prisma.class.findMany({
    where: { homeroomTeacherId: session!.user.id },
    include: { students: { orderBy: { name: "asc" } } },
  });

  return (
    <div>
      <p className="crumb">GURU</p>
      <h2 className="h2">Kelas bimbingan</h2>
      <p className="sub">Status persetujuan wali murid menentukan apakah siswa bisa mengunggah lembar kerja.</p>

      {classes.map((c) => (
        <div key={c.id} className="siswa-kelas">
          <p className="tbl-k" style={{ margin: 0 }}>
            {c.name.toUpperCase()} · {c.students.length} SISWA
          </p>
          <div className="siswa-roster">
            {c.students.length > 0 && (
              <div className="siswa-roster-head">
                <span>Nama</span>
                <span>NISN</span>
                <span>Persetujuan</span>
                <span>Aksi</span>
              </div>
            )}
            {c.students.map((s) => {
              const consent = CONSENT_LABEL[s.consentStatus];
              return (
                <div key={s.id} className="siswa-row">
                  <span className="row-n">{s.name}</span>
                  <span style={{ fontSize: 12, fontFamily: "var(--data)", color: "var(--graphite)" }}>{s.nisn}</span>
                  <span className={`pill ${consent.tone}`} style={{ justifySelf: "start" }}>
                    {consent.label}
                  </span>
                  <ResetPinButton studentId={s.id} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
