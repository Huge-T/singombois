import { auth } from "@/lib/auth";
import { BASELINE_INDICATORS } from "@/content/indicators";
import { computeLiveIndicators, MEASURABLE_CODES } from "@/lib/live-indicators";

export default async function IndikatorPage() {
  const session = await auth();
  const live = await computeLiveIndicators(session!.user.schoolId);

  const measuredRows = BASELINE_INDICATORS.filter((i) => (MEASURABLE_CODES as readonly string[]).includes(i.code));
  const baselineOnlyRows = BASELINE_INDICATORS.filter((i) => !(MEASURABLE_CODES as readonly string[]).includes(i.code));

  const deltas = measuredRows
    .map((i) => live[i.code]?.value)
    .filter((v): v is number => v != null)
    .map((v, idx) => v - measuredRows[idx].value);
  const avgDelta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null;

  return (
    <div>
      <p className="crumb">KOORDINATOR</p>
      <h2 className="h2">Indikator literasi</h2>
      <p className="sub">Baseline jurnal 2026 (n=288) dibanding pengukuran berjalan aplikasi.</p>

      <table className="ind" style={{ marginBottom: 8 }}>
        <thead>
          <tr>
            <th>INDIKATOR</th>
            <th>BASELINE → KINI → TARGET</th>
            <th className="n">BASE</th>
            <th className="n">KINI</th>
            <th className="n">Δ</th>
          </tr>
        </thead>
        <tbody>
          {measuredRows.map((ind) => {
            const measured = live[ind.code];
            const current = measured?.value;
            const flagged = ind.value < 72;
            const nowPct = current ?? ind.value;
            return (
              <tr key={ind.code} className={flagged ? "flag" : ""}>
                <td>{ind.label}</td>
                <td>
                  <span className="track">
                    <i className={`now ${flagged ? "w" : ""}`} style={{ width: `${nowPct}%` }} />
                    <i className="base" style={{ left: `${ind.value}%` }} />
                  </span>
                </td>
                <td className="n">{ind.value}</td>
                <td className="n">{current !== null && current !== undefined ? current : "belum ada data"}</td>
                <td className="n" style={{ color: current == null ? "var(--graphite)" : current >= ind.value ? "#2E6B57" : "#BE4630" }}>
                  {current == null ? "-" : `${current >= ind.value ? "+" : ""}${(current - ind.value).toFixed(1)}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p style={{ fontSize: 11, color: "var(--graphite)", marginBottom: 32 }}>
        n aplikasi = {measuredRows.map((i) => live[i.code]?.sampleN ?? 0).reduce((a, b) => Math.max(a, b), 0)} submission.
        Kolom KINI dihitung langsung dari skor tersimpan, bukan estimasi.
      </p>

      <p className="tbl-k">10 INDIKATOR LAINNYA · BASELINE JURNAL SAJA</p>
      <table className="ind" style={{ marginBottom: 12 }}>
        <thead>
          <tr>
            <th>INDIKATOR</th>
            <th className="n">BASELINE 2026</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {baselineOnlyRows.map((ind) => (
            <tr key={ind.code}>
              <td>{ind.label}</td>
              <td className="n">{ind.value}</td>
              <td style={{ fontSize: 12, color: "var(--graphite)" }}>
                Belum ada instrumen pengukuran berjalan di aplikasi
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="legend">
        <span>
          <b style={{ background: "#5A9B85" }} />
          PENGUKURAN KINI
        </span>
        <span>
          <b style={{ background: "#7C8590" }} />
          BASELINE JURNAL 2026
        </span>
      </div>

      <div className="foot-note">
        <span>
          RATA-RATA PERUBAHAN 5 INDIKATOR TERUKUR: {avgDelta === null ? "belum ada data" : `${avgDelta >= 0 ? "+" : ""}${avgDelta.toFixed(1)}`}
        </span>
      </div>
    </div>
  );
}
