import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AudioQcButton } from "./AudioQcButton";
import { AudioMaterialForm, ReadingTextForm, WorksheetTemplateForm } from "./forms";

export default async function MateriPage() {
  const session = await auth();
  const schoolId = session!.user.schoolId;

  const [texts, audios, templates, modules] = await Promise.all([
    prisma.readingText.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" } }),
    prisma.audioMaterial.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" } }),
    prisma.worksheetTemplate.findMany({ where: { schoolId } }),
    prisma.exerciseModule.findMany({ where: { schoolId } }),
  ]);

  return (
    <div>
      <p className="crumb">KOORDINATOR</p>
      <h2 className="h2">Bank materi</h2>
      <p className="sub">Teks bacaan, audio menyimak, template lembar kerja, dan modul latihan.</p>

      <p className="tbl-k">TEKS BACAAN ({texts.length})</p>
      {texts.map((t) => (
        <div className="row" key={t.id}>
          <span className="row-n">{t.title}</span>
          <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
            Kelas {t.gradeLevel} · {t.theme || "-"} · {t.quizJson ? "ada soal" : "tanpa soal pemahaman"}
          </span>
          <span className="row-v">{t.estMinutes} menit</span>
        </div>
      ))}
      <details style={{ margin: "14px 0 32px" }}>
        <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--measure)" }}>+ Tambah teks bacaan</summary>
        <div style={{ marginTop: 14 }}>
          <ReadingTextForm />
        </div>
      </details>

      <p className="tbl-k">AUDIO MENYIMAK ({audios.length})</p>
      {audios.map((a) => (
        <div key={a.id} className="row">
          <span className="row-n">{a.title}</span>
          <span className={`pill ${a.qcPassed ? "pill-ok" : "pill-mark"}`}>
            {a.qcPassed ? "LOLOS QC" : "MENUNGGU QC"}
          </span>
          <AudioQcButton audioId={a.id} qcPassed={a.qcPassed} />
        </div>
      ))}
      <details style={{ margin: "14px 0 32px" }}>
        <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--measure)" }}>+ Tambah audio</summary>
        <div style={{ marginTop: 14 }}>
          <AudioMaterialForm />
        </div>
      </details>

      <p className="tbl-k">TEMPLATE LEMBAR KERJA ({templates.length})</p>
      {templates.map((t) => (
        <div className="row" key={t.id}>
          <span className="row-n">{t.name}</span>
          <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Garis {t.lineHeightMm}mm</span>
          <span className="row-v">min {t.minWords} kata</span>
        </div>
      ))}
      <details style={{ margin: "14px 0 32px" }}>
        <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--measure)" }}>+ Tambah template</summary>
        <div style={{ marginTop: 14 }}>
          <WorksheetTemplateForm />
        </div>
      </details>

      <p className="tbl-k">MODUL LATIHAN KERAPIAN ({modules.length})</p>
      {modules.map((m) => (
        <div className="row" key={m.id}>
          <span className="row-n">{m.title}</span>
          <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{m.aspect}</span>
          <span className="row-v">{m.durationMin} menit</span>
        </div>
      ))}
    </div>
  );
}
