import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ImportForm } from "./ImportForm";
import { AddClassForm } from "./AddClassForm";
import { ClassSection } from "./ClassSection";

export default async function SiswaPage() {
  const session = await auth();
  const schoolId = session!.user.schoolId;

  const [classes, teachers] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId },
      include: { students: { orderBy: { name: "asc" }, where: { archivedAt: null } }, homeroomTeacher: true },
      orderBy: { name: "asc" },
    }),
    prisma.staffUser.findMany({ where: { schoolId, role: "TEACHER" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <p className="crumb">KOORDINATOR</p>
      <h2 className="h2">Kelas &amp; siswa</h2>
      <p className="sub">Impor data siswa dan kelola persetujuan wali murid (DATA-3/DATA-4).</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <details>
          <summary className="btn btn-ghost btn-sm">+ Tambah kelas baru</summary>
          <div style={{ marginTop: 14 }}>
            <AddClassForm />
          </div>
        </details>
        <details>
          <summary className="btn btn-ghost btn-sm">+ Impor siswa dari CSV</summary>
          <div style={{ marginTop: 14 }}>
            <ImportForm classes={classes.map((c) => ({ id: c.id, label: c.name }))} />
          </div>
        </details>
      </div>

      {classes.length > 1 && (
        <nav
          style={{
            position: "sticky",
            top: 61,
            zIndex: 5,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            padding: "10px 0",
            marginBottom: 14,
            background: "var(--kertas)",
            borderBottom: "1px solid var(--garis)",
          }}
        >
          {classes.map((c) => (
            <a key={c.id} href={`#kelas-${c.id}`} className="pill" style={{ textDecoration: "none" }}>
              {c.name} ({c.students.length})
            </a>
          ))}
        </nav>
      )}

      {classes.length === 0 && <p className="hint">Belum ada kelas. Buat kelas dulu di atas.</p>}

      {classes.map((c) => (
        <ClassSection
          key={c.id}
          classId={c.id}
          name={c.name}
          students={c.students.map((s) => ({
            id: s.id,
            name: s.name,
            nisn: s.nisn,
            consentStatus: s.consentStatus,
          }))}
          homeroomTeacherId={c.homeroomTeacherId}
          homeroomTeacherName={c.homeroomTeacher?.name ?? null}
          teachers={teachers.map((t) => ({ id: t.id, name: t.name }))}
        />
      ))}
    </div>
  );
}
