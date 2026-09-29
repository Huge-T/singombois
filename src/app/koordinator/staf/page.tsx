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

      <div className="siswa-kelas">
        <p className="tbl-k" style={{ margin: 0 }}>
          {staff.length} AKUN STAF
        </p>
        <div className="siswa-roster">
          {staff.length > 0 && (
            <div className="siswa-roster-head" style={{ gridTemplateColumns: "1fr 1fr 130px" }}>
              <span>Nama</span>
              <span>Email</span>
              <span>Peran</span>
            </div>
          )}
          {staff.map((s) => (
            <div key={s.id} className="siswa-row" style={{ gridTemplateColumns: "1fr 1fr 130px" }}>
              <span className="row-n">{s.name}</span>
              <span style={{ fontSize: 12.5, color: "var(--graphite)" }}>{s.email}</span>
              <span className="pill" style={{ justifySelf: "start" }}>
                {ROLE_LABEL[s.role] ?? s.role}
              </span>
            </div>
          ))}
        </div>
      </div>

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
