"use client";

import { useState } from "react";

const DATA = {
  kiri: {
    deg: -14,
    judul: "Menyimpan untuk diri sendiri",
    teks: "Tulisan miring ke kiri sering muncul pada penulis yang menjaga jarak dan lebih nyaman mengolah pikiran sendiri dulu sebelum bicara. Butuh waktu tenang sebelum ikut ramai.",
    catatan: "cocok: belajar mandiri, membaca dulu sebelum diskusi",
  },
  tegak: {
    deg: 0,
    judul: "Kepala di depan perasaan",
    teks: "Tulisan tegak menandakan penulis yang menimbang dengan kepala dingin dan tidak mudah terbawa suasana. Belajar paling lancar saat langkahnya jelas dan teratur.",
    catatan: "cocok: jadwal rapi, catatan terstruktur, latihan soal",
  },
  kanan: {
    deg: 14,
    judul: "Terbuka pada orang lain",
    teks: "Penulis dengan tulisan miring ke kanan biasanya hangat, ekspresif, dan nyaman bekerja bersama teman. Belajar terasa paling hidup saat ada diskusi dan kerja kelompok.",
    catatan: "cocok: belajar kelompok, presentasi, tutor sebaya",
  },
} as const;

type Miring = keyof typeof DATA;

const LABEL: Record<Miring, string> = {
  kiri: "Miring ke kiri",
  tegak: "Tegak",
  kanan: "Miring ke kanan",
};

export function DemoKemiringan() {
  const [miring, setMiring] = useState<Miring>("kanan");
  const d = DATA[miring];

  return (
    <div className="demo">
      <div className="demo-atas">
        <b>Kemiringan tulisanmu:</b>
        {(Object.keys(DATA) as Miring[]).map((k) => (
          <button
            key={k}
            type="button"
            className="pilih"
            aria-pressed={miring === k}
            onClick={() => setMiring(k)}
          >
            {LABEL[k]}
          </button>
        ))}
      </div>
      <div className="demo-isi">
        <div className="contoh">
          <span style={{ transform: `skewX(${-d.deg}deg)` }}>belajar</span>
        </div>
        <div className="baca" aria-live="polite">
          <h3>{d.judul}</h3>
          <p>{d.teks}</p>
          <p className="catatan">{d.catatan}</p>
        </div>
      </div>
    </div>
  );
}
