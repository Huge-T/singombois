"use client";

export function PrintButton() {
  return (
    <button type="button" className="btn btn-ghost btn-sm rekap-cetak" onClick={() => window.print()}>
      Cetak / simpan PDF
    </button>
  );
}
