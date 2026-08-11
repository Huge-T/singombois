/** Grafik batang satu-seri, digambar server-side sebagai SVG (tanpa library).
 *  Spesifikasi mark: batang maks 24px, ujung-data membulat 4px & datar di
 *  baseline, gridline hairline recessive, label memakai token teks (bukan warna
 *  data), nilai dilabel selektif (puncak + terakhir), tooltip native <title>,
 *  dan tabel tersembunyi untuk pembaca layar. */

export interface BarDatum {
  label: string;
  value: number;
  detail?: string; // isi tooltip; default "label: value"
}

const BAR_COLOR = "#3a4a7a"; // biru-tinta tema, kontras 8.2:1 di atas kertas-terang
const GRID_COLOR = "#c9d6e8"; // --garis
const TEXT_MUTED = "#4b5673"; // --tinta-lembut

function niceMax(maxValue: number): number {
  if (maxValue <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(maxValue)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (maxValue <= m * pow) return m * pow;
  }
  return 10 * pow;
}

export function BarChart({
  data,
  title,
  valueSuffix = "",
  maxScale,
  height = 200,
}: {
  data: BarDatum[];
  title: string;
  valueSuffix?: string;
  maxScale?: number; // paksa skala (mis. 5 untuk skor 1-5)
  height?: number;
}) {
  if (data.length === 0) return null;

  const width = 560;
  const pad = { top: 22, right: 8, bottom: 26, left: 30 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const yMax = maxScale ?? niceMax(Math.max(...data.map((d) => d.value)));
  const ticks = [0, yMax / 2, yMax];

  const band = plotW / data.length;
  const barW = Math.min(24, band * 0.6);
  const r = 4;

  const maxIdx = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const lastIdx = data.length - 1;

  const fmt = (v: number) =>
    (Number.isInteger(v) ? v.toString() : v.toFixed(1)) + valueSuffix;

  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={title}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        {ticks.map((t) => {
          const y = pad.top + plotH - (t / yMax) * plotH;
          return (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
              <text x={pad.left - 6} y={y + 3.5} textAnchor="end" fontSize={10} fill={TEXT_MUTED}>
                {Number.isInteger(t) ? t : t.toFixed(1)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const h = yMax > 0 ? (d.value / yMax) * plotH : 0;
          const x = pad.left + i * band + (band - barW) / 2;
          const y = pad.top + plotH - h;
          const rr = Math.min(r, h); // batang sangat pendek: jangan lebih bulat dari tingginya
          const path =
            h <= 0
              ? ""
              : `M ${x} ${pad.top + plotH} V ${y + rr} Q ${x} ${y} ${x + rr} ${y} H ${x + barW - rr} Q ${x + barW} ${y} ${x + barW} ${y + rr} V ${pad.top + plotH} Z`;
          const labeled = i === maxIdx || i === lastIdx;
          return (
            <g key={d.label + i}>
              {path && (
                <path d={path} fill={BAR_COLOR}>
                  <title>{d.detail ?? `${d.label}: ${fmt(d.value)}`}</title>
                </path>
              )}
              {labeled && d.value > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontWeight={700}
                  fill={TEXT_MUTED}
                >
                  {fmt(d.value)}
                </text>
              )}
              <text
                x={pad.left + i * band + band / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize={10}
                fill={TEXT_MUTED}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Kategori</th>
            <th scope="col">Nilai</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={d.label + i}>
              <td>{d.label}</td>
              <td>{fmt(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
