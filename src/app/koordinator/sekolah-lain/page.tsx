import { prisma } from "@/lib/prisma";
import { ContactLeadToggle } from "./ContactLeadToggle";

export default async function SekolahLainPage() {
  const leads = await prisma.contactLead.findMany({ orderBy: { createdAt: "desc" } });
  const pending = leads.filter((l) => !l.handled).length;

  return (
    <div>
      <p className="crumb">KOORDINATOR</p>
      <h2 className="h2">Minat sekolah lain</h2>
      <p className="sub">
        Formulir minat adopsi dari halaman publik /untuk-sekolah-lain. Tandai sudah dihubungi
        setelah tim menindaklanjuti lewat email yang didaftarkan.
      </p>

      <div className="metrics">
        <div className="metric">
          <p className="metric-k">MINAT MASUK</p>
          <p className="metric-v">{leads.length}</p>
        </div>
        <div className="metric">
          <p className="metric-k">BELUM DITINDAKLANJUTI</p>
          <p className="metric-v">{pending}</p>
        </div>
      </div>

      {leads.length === 0 && (
        <p style={{ fontSize: 14, color: "var(--tinta-lembut)" }}>
          Belum ada sekolah yang mengisi formulir minat adopsi.
        </p>
      )}

      {leads.map((l) => (
        <div className="card" key={l.id} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap", marginBottom: 8 }}>
            <b style={{ fontSize: 14.5 }}>{l.schoolName}</b>
            <span style={{ fontSize: 12.5, color: "var(--tinta-lembut)" }}>
              {l.contactName} · {l.email}
            </span>
            <span style={{ fontSize: 12, color: "var(--tinta-lembut)" }}>
              {l.createdAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <span className={`pill ${l.handled ? "pill-ok" : "pill-mark"}`}>
              {l.handled ? "SUDAH DIHUBUNGI" : "BARU"}
            </span>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.65, marginBottom: 12 }}>{l.message}</p>
          <ContactLeadToggle leadId={l.id} handled={l.handled} />
        </div>
      ))}
    </div>
  );
}
