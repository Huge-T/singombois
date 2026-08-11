import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AddStaffForm } from "./AddStaffForm";

const ROLE_LABEL: Record<string, string> = {
  TEACHER: "GURU",
  GURU_BK: "GURU BK",
  COORDINATOR: "KOORDINATOR",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER ADMIN",
};

export default async function StafPage() {
  const session = await auth();
  const schoolId = session!.user.schoolId;

  const staff = await prisma.staffUser.findMany({
    where: { schoolId },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <p className="crumb">KOORDINATOR</p>
      <h2 className="h2">Kelola staf</h2>
      <p className="sub">
        Buat akun untuk guru, guru BK, atau koordinator baru. Siswa didaftarkan lewat halaman
        Kelas &amp; siswa.
      </p>

      <p className="tbl-k">{staff.length} AKUN STAF</p>
      {staff.map((s) => (
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
          <span style={{ fontSize: 12.5, color: "var(--graphite)", flex: 1 }}>{s.email}</span>
          <span className="pill" style={{ width: 120, textAlign: "center" }}>
            {ROLE_LABEL[s.role] ?? s.role}
          </span>
        </div>
      ))}

      <details style={{ marginTop: 20 }}>
        <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--measure)" }}>
          + Tambah akun staf
        </summary>
        <div style={{ marginTop: 14 }}>
          <AddStaffForm />
        </div>
      </details>
    </div>
  );
}
