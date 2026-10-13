import type { CategoryShare } from "@/lib/rekap";

/** Diagram batang horizontal per kategori. Digambar dengan CSS (tanpa library),
 *  nilai selalu tertulis sebagai teks supaya terbaca di cetak & pembaca layar. */
export function DistRows({ shares, compact = false }: { shares: CategoryShare[]; compact?: boolean }) {
  const maxPct = Math.max(...shares.map((s) => s.pct));
  return (
    <ul className={`rekap-rows${compact ? " rekap-rows-ringkas" : ""}`}>
      {shares.map((s) => (
        <li key={s.category}>
          <div className="rekap-baris-judul">
            <span>
              <b>{s.title}</b>
              <small> · {s.category.toLowerCase()}</small>
            </span>
            <span className="rekap-nilai">
              {s.pct}%{compact ? "" : <small> ({s.count})</small>}
            </span>
          </div>
          <div className="rekap-track" role="img" aria-label={`${s.title}: ${s.pct} persen`}>
            <i className={s.pct > 0 && s.pct === maxPct ? "puncak" : ""} style={{ width: `${s.pct}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
