import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_LABEL: Record<string, { label: string; pill: string }> = {
  OPEN: { label: "BELUM DIBALAS", pill: "pill-mark" },
  ANSWERED: { label: "SUDAH DIBALAS", pill: "pill-ok" },
  CLOSED: { label: "DITUTUP", pill: "pill-graphite" },
};

export default async function BkTiketPage() {
  const session = await auth();
  const schoolId = session!.user.schoolId;

  const tickets = await prisma.consultTicket.findMany({
    where: { student: { schoolId } },
    include: { student: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  });

  const open = tickets.filter((t) => t.status !== "CLOSED");
  const closed = tickets.filter((t) => t.status === "CLOSED");

  return (
    <div>
      <p className="crumb">GURU BK</p>
      <h2 className="h2">Tiket konsultasi</h2>
      <p className="sub">Pertanyaan siswa seputar hasil pembacaan atau validasi lebih lanjut.</p>

      <p className="tbl-k">AKTIF ({open.length})</p>
      {open.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 20 }}>Tidak ada tiket aktif.</p>
      )}
      {open.map((t) => (
        <div className="row" key={t.id}>
          <span className="row-n">{t.student.name}</span>
          <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{t.subject}</span>
          <Link href={`/bk/tiket/${t.id}`} className="btn btn-sm">
            <span className={`pill ${STATUS_LABEL[t.status].pill}`} style={{ marginRight: 8 }}>
              {STATUS_LABEL[t.status].label}
            </span>
            Buka
          </Link>
        </div>
      ))}

      {closed.length > 0 && (
        <>
          <p className="tbl-k" style={{ marginTop: 28 }}>
            DITUTUP ({closed.length})
          </p>
          {closed.map((t) => (
            <div className="row dim" key={t.id}>
              <span className="row-n">{t.student.name}</span>
              <span style={{ fontSize: 12.5 }}>{t.subject}</span>
              <Link href={`/bk/tiket/${t.id}`} className="btn btn-ghost btn-sm">
                Lihat
              </Link>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
