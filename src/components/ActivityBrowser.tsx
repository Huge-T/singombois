"use client";

import { useRef, useState } from "react";

export interface ActivityCardData {
  id: string;
  title: string;
  category: string;
  year: number;
  photos: { id: string; url: string }[];
}

/** Kisi kartu kegiatan dengan tab tahun; klik kartu membuka galeri foto
 *  lengkapnya lewat <dialog> native (buka/tutup + backdrop gratis dari
 *  browser, tanpa perlu library modal). */
export function ActivityBrowser({
  activities,
  showTabs = true,
}: {
  activities: ActivityCardData[];
  /** false untuk pratinjau ringkas (mis. beranda): tampilkan semua yang
   *  dikirim tanpa tab tahun. */
  showTabs?: boolean;
}) {
  const years = [...new Set(activities.map((a) => a.year))].sort((a, b) => b - a);
  const [activeYear, setActiveYear] = useState<number | null>(showTabs ? years[0] ?? null : null);
  const [detail, setDetail] = useState<ActivityCardData | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function openDetail(a: ActivityCardData) {
    setDetail(a);
    dialogRef.current?.showModal();
  }

  const shown = activeYear !== null ? activities.filter((a) => a.year === activeYear) : activities;

  return (
    <div>
      {showTabs && years.length > 0 && (
        <div className="tahun-tab" role="tablist" aria-label="Pilih tahun kegiatan">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              role="tab"
              aria-selected={activeYear === y}
              className={activeYear === y ? "on" : ""}
              onClick={() => setActiveYear(y)}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="hint">Belum ada kegiatan tercatat untuk tahun ini.</p>
      ) : (
        <div className="giat">
          {shown.map((a) => (
            <button type="button" key={a.id} onClick={() => openDetail(a)}>
              {a.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.photos[0].url} alt={a.title} />
              ) : (
                <div className="giat-kosong">Belum ada foto dokumentasi</div>
              )}
              <div className="giat-teks">
                <small>{a.category}</small>
                {a.title}
              </div>
            </button>
          ))}
        </div>
      )}

      <dialog
        ref={dialogRef}
        className="giat-dialog"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        {detail && (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="giat-dialog-tutup"
              onClick={() => dialogRef.current?.close()}
              aria-label="Tutup"
            >
              ×
            </button>
            <p className="penunjuk" style={{ marginBottom: 6 }}>
              {detail.category} · {detail.year}
            </p>
            <h3>{detail.title}</h3>
            {detail.photos.length === 0 ? (
              <p className="hint">Belum ada foto dokumentasi untuk kegiatan ini.</p>
            ) : (
              <div className="giat-galeri">
                {detail.photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.id} src={p.url} alt={detail.title} />
                ))}
              </div>
            )}
          </div>
        )}
      </dialog>
    </div>
  );
}
