import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_LABEL: Record<string, { label: string; pill: string }> = {
  OPEN: { label: "MENUNGGU BALASAN", pill: "pill-graphite" },
  ANSWERED: { label: "SUDAH DIBALAS", pill: "pill-ok" },
  CLOSED: { label: "DITUTUP", pill: "pill-graphite" },
};

export default async function KonsultasiListPage() {
  const session = await auth();

  const tickets = await prisma.consultTicket.findMany({
    where: { studentId: session!.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <p className="crumb">SISWA</p>
      <h2 className="h2">Konsultasiku</h2>
      <p className="sub">
        Tiket dibuka lewat tombol &quot;Tanya / validasi ke ahli&quot; di halaman hasil sesi.
      </p>

      {tickets.length === 0 && (
        <p style={{ fontSize: 14, color: "var(--tinta-lembut)" }}>
          Belum ada tiket konsultasi. Buka salah satu dari halaman hasil sesimu.
        </p>
      )}
      {tickets.map((t) => (
        <div className="row" key={t.id}>
          <span className="row-n">{t.subject}</span>
          <span className={`pill ${STATUS_LABEL[t.status].pill}`}>{STATUS_LABEL[t.status].label}</span>
          <Link href={`/siswa/konsultasi/${t.id}`} className="btn btn-sm">
            Buka
          </Link>
        </div>
      ))}
    </div>
  );
}
