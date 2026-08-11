"use client";

export function PrintButton() {
  return (
    <button className="btn" style={{ marginBottom: 20 }} onClick={() => window.print()}>
      Cetak sekarang
    </button>
  );
}
