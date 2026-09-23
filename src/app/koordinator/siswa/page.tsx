import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConsentButtons } from "./ConsentButtons";
import { ImportForm } from "./ImportForm";
import { AddClassForm } from "./AddClassForm";
import { ClassNameEditor } from "./ClassNameEditor";
import { DeleteClassButton } from "./DeleteClassButton";

const CONSENT_LABEL: Record<string, { label: string; tone: string }> = {
  GRANTED: { label: "DISETUJUI", tone: "pill-ok" },
  PENDING: { label: "MENUNGGU", tone: "pill-mark" },
  REVOKED: { label: "DICABUT", tone: "pill-mark" },
};

export default async function SiswaPage() {
  const session = await auth();
  const schoolId = session!.user.schoolId;

  const classes = await prisma.class.findMany({
    where: { schoolId },
    include: { students: { orderBy: { name: "asc" }, where: { archivedAt: null } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <p className="crumb">KOORDINATOR</p>
      <h2 className="h2">Kelas &amp; siswa</h2>
      <p className="sub">Impor data siswa dan kelola persetujuan wali murid (DATA-3/DATA-4).</p>

      {classes.map((c) => (
        <div key={c.id} style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <p className="tbl-k" style={{ margin: 0 }}>
              {c.name.toUpperCase()} · {c.students.length} SISWA
            </p>
            <ClassNameEditor classId={c.id} name={c.name} />
            <DeleteClassButton classId={c.id} name={c.name} studentCount={c.students.length} />
          </div>
          {c.students.map((s) => {
            const consent = CONSENT_LABEL[s.consentStatus];
            return (
              <div
                key={s.id}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "9px 0", borderBottom: "1px solid var(--rule-soft)" }}
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
                <ConsentButtons studentId={s.id} status={s.consentStatus} />
              </div>
            );
          })}
        </div>
      ))}

      <details style={{ marginTop: 20 }}>
        <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--measure)" }}>+ Tambah kelas baru</summary>
        <div style={{ marginTop: 14 }}>
          <AddClassForm />
        </div>
      </details>

      <details style={{ marginTop: 12 }}>
        <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--measure)" }}>+ Impor siswa dari CSV</summary>
        <div style={{ marginTop: 14 }}>
          <ImportForm classes={classes.map((c) => ({ id: c.id, label: c.name }))} />
        </div>
      </details>
    </div>
  );
}
