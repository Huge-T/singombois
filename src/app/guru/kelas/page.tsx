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
        <div key={c.id} style={{ marginBottom: 28 }}>
          <p className="tbl-k">{c.name.toUpperCase()} · {c.students.length} SISWA</p>
          {c.students.map((s) => {
            const consent = CONSENT_LABEL[s.consentStatus];
            return (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "9px 0",
                  borderBottom: "1px solid var(--rule-soft)",
                }}
              >
                <span className="row-n" style={{ flex: 1 }}>
                  {s.name}
                </span>
                <span style={{ fontSize: 12, fontFamily: "var(--data)", color: "var(--graphite)", width: 130 }}>
                  NISN {s.nisn}
                </span>
                <span className={`pill ${consent.tone}`} style={{ width: 90, textAlign: "center" }}>
                  {consent.label}
                </span>
                <ResetPinButton studentId={s.id} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
