# Kontrak aset

File-file ini belum tersedia di repo dan perlu diunggah tim SINGO MBOIS. Kode sudah siap
memakainya lewat `src/content/assets.ts`: bila file belum ada, halaman menampilkan placeholder
rapi (tanpa gambar rusak atau link mati); begitu file diletakkan di path yang tepat, halaman
Beranda/Tim/Giat otomatis memakainya di deploy berikutnya.

| Aset | Letakkan di | Nama file persis |
|---|---|---|
| Logo SINGO MBOIS (transparan) | `public/logo/` | `singo-mbois.png` |
| Logo SMPN 27 Malang | `public/logo/` | `smpn27.png` |
| SK program | `public/dokumen/` | `sk-singo-mbois.pdf` |
| Buku Panduan Teknis | `public/dokumen/` | `buku-panduan-teknis.pdf` |
| Video tutorial | `public/dokumen/` | `video-tutorial.mp4` |
| Foto giat | `public/foto/giat/` | `sosialisasi.jpg`, `tes-awal.jpg`, `pendampingan-tes-awal.jpg`, `menyimak.jpg`, `literasi-vii-c.jpg`, `literasi-ix-c.jpg` (`.png` juga didukung) |
| Foto tim (opsional) | `public/foto/tim/` | `nama-divisi-atau-orang.jpg` (kebab-case) |
| Audio rekaman produksi menyimak Level Middle (rekaman tim Juli 2026 rusak; masih TTS) | `public/audio/` | rekam ulang, lalu perbarui `fileUrl` materi Middle di seed |

Sampai file tersedia, dokumen (SK/Panduan/Video) menaut ke Google Sites lama (lihat
`REDIRECTS.md`) supaya tidak ada konten yatim, dan kartu giat tanpa foto tampil tanpa gambar
alih-alih rusak.

Sudah terpenuhi: gambar bercerita Low/Middle/High di `public/tes/`
(`gambar-bercerita-low.jpg`, `gambar-bercerita-middle.jpg`, `gambar-bercerita-high.jpg`);
audio produksi tim (Juli 2026) di `public/audio/`: `menyimak-teks-berita-low.m4a`,
`soal-teks-berita-low.m4a`, `menyimak-teks-eksplanasi-high.m4a`,
`soal-teks-eksplanasi-high.m4a`.
