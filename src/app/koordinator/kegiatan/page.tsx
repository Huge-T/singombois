import { auth } from "@/lib/auth";
import { getActivitiesForSchool } from "@/lib/activities";
import { AddActivityForm } from "./AddActivityForm";
import { AddPhotoForm } from "./AddPhotoForm";
import { DeleteActivityButton } from "./DeleteActivityButton";
import { DeletePhotoButton } from "./DeletePhotoButton";

export default async function KegiatanPage() {
  const session = await auth();
  const activities = await getActivitiesForSchool(session!.user.schoolId);

  const byYear = new Map<number, typeof activities>();
  for (const a of activities) {
    if (!byYear.has(a.year)) byYear.set(a.year, []);
    byYear.get(a.year)!.push(a);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  return (
    <div>
      <p className="crumb">KOORDINATOR</p>
      <h2 className="h2">Kegiatan</h2>
      <p className="sub">
        Kartu dokumentasi kegiatan yang tampil di halaman publik /giat dan beranda, dikelompokkan per tahun.
      </p>

      {years.length === 0 && <p className="hint" style={{ marginBottom: 20 }}>Belum ada kegiatan.</p>}

      {years.map((year) => (
        <div key={year} style={{ marginBottom: 28 }}>
          <p className="tbl-k">{year} ({byYear.get(year)!.length})</p>
          {byYear.get(year)!.map((a) => (
            <div className="row" key={a.id} style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <span className="row-n">{a.title}</span>
                <span style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)" }}>{a.category}</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {a.photos.map((p) => (
                    <div key={p.id} style={{ position: "relative" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.url}
                        alt={a.title}
                        style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 3, border: "1px solid var(--edge)" }}
                      />
                      <DeletePhotoButton photoId={p.id} />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10 }}>
                  <AddPhotoForm activityId={a.id} />
                </div>
              </div>
              <DeleteActivityButton activityId={a.id} title={a.title} />
            </div>
          ))}
        </div>
      ))}

      <details style={{ margin: "14px 0 32px" }}>
        <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--measure)" }}>+ Tambah kegiatan</summary>
        <div style={{ marginTop: 14 }}>
          <AddActivityForm />
        </div>
      </details>
    </div>
  );
}
