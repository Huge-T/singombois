# SINGO MBOIS — Web App

Implementasi kerja dari `prd.md` dan `Mockup.html` di root repo ini. Next.js full-stack
(App Router + TypeScript), Prisma/PostgreSQL, NextAuth, dan mesin analisis kualitas tulisan
tangan yang benar-benar mengukur piksel — bukan simulasi angka acak. Sejak 20 Jul 2026
disiapkan untuk deploy ke Vercel (lihat [Deploy ke Vercel](#deploy-ke-vercel)); database
sebelumnya SQLite lokal, kini PostgreSQL (Neon) karena disk fungsi serverless Vercel tidak
permanen.

## Menjalankan

Butuh database Postgres (Neon punya tingkat gratis dan paling gampang dipasangkan ke
Vercel nanti) — lihat `.env.example` untuk format `DATABASE_URL`/`DIRECT_URL`.

```bash
npm install
cp .env.example .env    # lalu isi DATABASE_URL & DIRECT_URL dengan Postgres kamu
npx prisma db push      # sinkronkan skema ke database
npm run db:seed         # isi data demo (sekolah, kelas, siswa, sesi, indikator baseline)
npm run dev
```

Buka http://localhost:3000.

Berkas unggahan (foto lembar jawaban, audio materi via koordinator) disimpan ke `public/`
di lokal, dan ke Vercel Blob di produksi — otomatis, lihat `src/lib/storage.ts`.

### Akun demo (dari seed)

| Peran | Login |
|---|---|
| Siswa | NISN `007001042` (Dinda Ayu Lestari) · PIN `1234` — siswa lain juga PIN `1234`, NISN mulai `0071042` |
| Guru | `guru@singombois.demo` / `guru123` |
| Koordinator | `koordinator@singombois.demo` / `koordinator123` |
| Admin | `admin@singombois.demo` / `admin123` |
| Guru BK | `bk@singombois.demo` / `bk123` |

Audio "menyimak" di-generate ulang otomatis oleh `db:seed` lewat `say`/`afconvert` bawaan
macOS (voice Indonesia "Damayanti"). Di OS lain, seed akan lewati langkah itu dan
`AudioMaterial.fileUrl` kosong — sesi tetap jalan, hanya pemutar audio akan menampilkan
pesan "belum tersedia" alih-alih pura-pura ada berkas.

## Tes Grafologi Gestalt berlevel (Low / Middle / High)

Desain tes mengikuti Grafologi Teori Gestalt dengan 3 variabel. Dua dikelola web:
**kemiringan huruf** (diukur mesin via shear-projection per baris tulisan, `estimateSlant`
di `src/lib/vision.ts`, extractor `geo-v1.1`) dan **ukuran & spasi** (x-height mm + rasio
spasi antar kata, sudah ada sejak v1). Variabel ketiga, **tekanan tulisan**, sengaja TIDAK
diukur dari foto (tak valid) dan diuji langsung Guru BK/psikolog saat tatap muka.

- **Interpretasi** di `src/lib/gestalt.ts` (`gestalt-v1.0`): ambang terbuka (tegak = ±4°,
  ukuran kecil < 4mm / besar > 7mm, spasi rapat < 0.7x / lebar > 1.4x), framing positif,
  selalu berlabel "indikasi awal, divalidasi Guru BK/ahli".
- **Tiga level tes** (konten dari tim): Low = fabel "Kura-kura yang Sombong" + 5 soal
  uraian; Middle = menyimak berita Orem-orem (6 soal, dibacakan 2-3x); High = menyimak
  eksplanasi "Proses Terjadinya Hujan" (5 soal). Tiap level ditutup **gambar bercerita**
  (gambar + kalimat pembuka, siswa melanjutkan cerita). Semua jawaban DITULIS TANGAN di
  lembar kerja (bagian A = jawaban soal, bagian B = lanjutan cerita) — tulisan itulah
  spesimen analisisnya. Audio Middle/High sementara TTS; ganti file di `public/audio/`
  (lihat ASSETS.md), termasuk 3 gambar stimulus di `public/tes/`.
- **Alur**: guru membuat sesi per level (bisa untuk seluruh kelas atau siswa terpilih via
  `SessionStudent` — screening individual); siswa mengerjakan lalu unggah; indikasi Gestalt
  langsung tampil di hasil dengan label "menunggu validasi Guru BK"; BK memvalidasi lewat
  editor pembacaan (panel indikasi mesin sebagai referensi); setelah 3 level tervalidasi,
  BK menulis **kesimpulan akhir** di `/bk/kesimpulan/[studentId]` (publikasi ditolak server
  bila belum 3 level) dan siswa melihatnya di "Data tentang saya".

## Lapisan pembacaan karakter & konsultasi (redesign singo-mbois.html)

Selain lapisan literasi terukur (§Apa yang nyata di v1 ini), aplikasi punya lapisan kedua yang
sengaja dipisah: **pembacaan potensi siswa lewat tulisan/gambar oleh manusia** (Guru BK), bukan
skor mesin.

- Siswa mengunggah **Tulisan** atau **Gambar** (`Artifact.kind`); gambar dilewatkan dari gate
  minimum-kata dan rubrik kerapian (tidak relevan untuk gambar), tapi tetap masuk antrean.
- Peran baru **Guru BK** (`/bk`) membaca lembar siswa, menulis 2-3 potensi positif + saran cara
  belajar lewat `CharacterReading` (draf/publikasi terpisah — siswa hanya melihat versi terbit).
- Hasil pembacaan tampil di halaman hasil siswa **di atas** skor literasi teknis, dengan bahasa
  fokus-kekuatan, terpisah tegas dari skor yang ditinjau wali kelas (query server tidak pernah
  menggabungkan keduanya untuk peran guru/koordinator).
- Siswa bisa membuka **tiket konsultasi** (`/siswa/konsultasi`) ke Guru BK per hasil sesi, atau
  langsung menghubungi hotline WhatsApp tim.
- Koordinator hanya melihat **statistik agregat** (antrean, terbit, tiket terbuka) di ringkasan
  program — isi pembacaan per siswa tidak pernah terbuka dari sana.
- Setiap pembukaan lembar oleh Guru BK dan publikasi hasil tercatat di `AuditLog` (terlihat di
  `/koordinator/log-akses`).

## Kemanfaatan & tanggapan siswa (bukti pemakaian, first-party)

Beranda punya bagian "Kemanfaatan" dan "Tanggapan siswa" yang seluruhnya berjalan tanpa
layanan pihak ketiga (tanpa Google Form/Sheet, Abacus, atau GA4):

- **Angka dampak dihitung live dari database** — siswa terlayani (pembacaan terbit),
  rombongan belajar (kelas ber-sesi), tanggapan masuk, kunjungan halaman. Tidak ada angka
  yang diketik manual, jadi tidak mungkin "mengarang angka".
- **Penghitung kunjungan sendiri** (`/api/kunjungan` + tabel `PageVisit`): cookie anonim
  `sm_vid` berisi UUID acak saja (tanpa data pribadi), dedup satu hitungan per pengunjung
  per halaman per hari lewat unique constraint. Grafik kunjungan per minggu digambar
  SVG server-side dari tabel yang sama.
- **Angket siswa in-app** (lima pertanyaan sesuai draf tim): muncul di halaman hasil sesi.
  Pertanyaan saran (nomor 4) bersifat internal dan tidak pernah tampil publik. Persetujuan
  tampil (dengan nama / anonim / tidak) dipilih siswa sendiri di formulir.
- **Moderasi koordinator** (`/koordinator/tanggapan`): kesan siswa baru tayang di beranda
  setelah disetujui; tanggapan ber-persetujuan "tidak boleh" ditolak server-side dari
  penayangan. Setiap tayang/turunkan tercatat di `AuditLog`. Rata-rata skor "paham cara
  belajar" per kelas hanya tampil bila kelas punya minimal 3 tanggapan, supaya jawaban
  individu tidak bisa ditebak.

## Apa yang nyata di v1 ini

- **Autentikasi sungguhan** — NISN+PIN untuk siswa, email+password untuk staf, session
  JWT via NextAuth, role guard di `src/proxy.ts` (penerus `middleware.ts` di Next 16).
- **Mesin analisis tulisan tangan nyata** (`src/lib/vision.ts`, `src/lib/analysis.ts`) —
  bukan skor acak. Pipelinenya:
  1. Deteksi buram lewat *variance of Laplacian* pada citra grayscale.
  2. Kalibrasi mm/px dari **jarak garis buku tulis yang benar-benar terdeteksi di foto**
     (bukan marker fidusial penuh seperti di PRD §5.3 — itu simplifikasi v1 yang
     didokumentasikan langsung di kode).
  3. Binarisasi Otsu, connected-component labeling (flood fill iteratif) untuk
     menemukan unit tulisan, dikelompokkan jadi "kata" berdasar jarak horizontal.
  4. Fitur diukur: tinggi huruf & konsistensinya, deviasi baseline, rasio & konsistensi
     jarak antar kata, kepatuhan margin — semua dengan satuan nyata (mm/%/rasio).
  5. Kemiringan & kepadatan coretan **sengaja tidak diukur** (dilaporkan "tidak dapat
     dinilai", bukan dikarang) karena butuh analisis stroke-skeleton di luar cakupan v1.
  6. Rubrik skor (`src/lib/rubric.ts`) adalah kode versi-terbuka (`kerapian-v1.0`), bukan
     black box — setiap ambang batas dikomentari alasannya.
- **Gate kualitas foto nyata** — foto buram, resolusi rendah, atau pencahayaan timpang
  ditolak dengan alasan spesifik (diuji: lihat bagian Verifikasi di bawah).
- **Kappa Cohen sungguhan** (`src/lib/kappa.ts`) untuk kesepakatan mesin–guru, dihitung
  dari histori `TeacherReview`, bukan angka tetap.
- **Cetak lembar kerja** menghasilkan QR code asli per siswa (`qrcode` package) dan garis
  bergaris pada warna yang persis sama dengan yang dideteksi pipeline analisis — jadi
  kalibrasi di atas benar-benar tertutup lingkarannya.
- **Privasi**: DATA-4 (blokir unggah tanpa persetujuan wali) ditegakkan di server, bukan
  cuma UI; PRIV-6/7 (ekspor & lihat data sendiri) dan pencabutan persetujuan
  (hapus artefak + file fisik) sungguhan jalan, bukan tombol dekoratif.

## Batasan yang disengaja (bukan bug)

Beberapa item P0/P1 di PRD sengaja belum dibangun penuh — didaftar di sini supaya jelas
bedanya dengan sesuatu yang lupa dikerjakan:

- **Model keterbacaan terlatih (AN-8/§7)** — PRD sendiri bilang ini menyusul di v2 setelah
  ≥3.000 lembar berlabel terkumpul. Skor "Menulis · Isi" masih murni penilaian guru.
- **QC audio otomatis (loudness/LUFS, AUD-1)** — diganti proses manusia: koordinator
  menandai "lolos uji dengar" sendiri di Bank Materi. Analisis LUFS otomatis butuh
  library audio DSP yang di luar cakupan waktu build ini.
- **Marker fidusial 4-sudut + deteksi QR otomatis saat unggah (UP-2/UP-3)** — lembar cetak
  sudah menyertakan QR asli per siswa untuk fondasi fitur ini, tapi endpoint unggah masih
  mengandalkan sesi login siswa untuk pemasangan identitas, bukan pembacaan QR dari foto.
- **10 dari 15 indikator jurnal** di dasbor koordinator hanya tampil sebagai baseline —
  5 lainnya (membaca, menyimak, kerapian, isi tulisan, penyelesaian lembar kerja) dihitung
  live dari data aplikasi. Sisanya butuh instrumen survei yang tidak diimplementasikan;
  dasbor secara eksplisit bilang "belum ada instrumen" alih-alih mengarang angka kini.
- **PWA offline queue, multi-sekolah penuh, retensi otomatis 2 tahun, CSV naik-kelas
  otomatis** — di luar cakupan MVP ini; skema data (`schoolId` di semua tabel) sudah
  disiapkan untuk multi-tenant, tinggal alur UI-nya yang belum dibangun.

## Verifikasi yang sudah dijalankan

- `npx tsc --noEmit` dan `npx eslint src` bersih di seluruh kode.
- Login + crawl semua halaman utama untuk ketiga peran (siswa/guru/koordinator) → semua
  200, tidak ada crash server.
- Upload foto lembar kerja sintetis (baris bergaris + blok tinta acak) lewat endpoint
  `/api/upload/[submissionId]` sungguhan → pipeline menghasilkan angka yang masuk akal
  dan konsisten dengan citra masukan (bukan dites lewat mock).
- Foto sengaja dirusak (datar/tanpa tepi, dan resolusi kecil) → ditolak gate dengan pesan
  yang tepat, membuktikan sistem menolak alih-alih mengarang skor.
- Belum ada uji browser interaktif otomatis (tidak ada Playwright/browser tool di
  environment ini) — interaksi klik/form React (bukan route GET) divalidasi lewat
  pembacaan kode + smoke test HTTP, bukan observasi visual langsung. Disarankan klik-klik
  manual sebelum dipakai sungguhan di kelas.

## Deploy ke Vercel

Shared hosting biasa (mis. Hostinger paket web hosting) tidak bisa menjalankan app ini —
butuh runtime Node.js yang jalan terus, bukan sekadar PHP/statis. Vercel dipilih karena
pembuat Next.js sendiri dan dukungan App Router-nya paling mulus.

Sekali per proyek (bukan tiap deploy):

1. **Database**: buat project Postgres gratis di [neon.tech](https://neon.tech). Salin
   *pooled connection string* → `DATABASE_URL`, dan *direct connection string* →
   `DIRECT_URL` (dua tab berbeda di dashboard Neon; lihat `.env.example`).
2. **Vercel project**: `npx vercel link` dari folder `app/` (login lewat browser saat
   diminta), atau import repo ini lewat dashboard Vercel.
3. **Env vars**: di Vercel → Project → Settings → Environment Variables, isi
   `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (generate baru dengan
   `openssl rand -base64 32`, JANGAN pakai nilai dev). **Jangan** isi
   `NEXTAUTH_URL`/`AUTH_URL` — Vercel mengirim header host yang benar sendiri dan
   `trustHost: true` di `src/lib/auth.ts` sudah menanganinya.
4. **Blob store**: Vercel → Project → Storage → Create → Blob. Setelah dipasang, Vercel
   otomatis menyuntik `BLOB_READ_WRITE_TOKEN` — tidak perlu diisi manual. Tanpa ini,
   unggahan foto akan gagal di produksi (disk fungsi serverless tidak permanen).
5. **Sinkronkan skema** ke database produksi: `DATABASE_URL="<pooled>" DIRECT_URL="<direct>" npx prisma db push`
   dari lokal (sekali di awal, lalu tiap ada perubahan `schema.prisma`).
6. **Domain sekolah** (opsional): Vercel → Project → Settings → Domains → tambah
   subdomain (mis. `singombois.smpn27malang.sch.id`), lalu tambah **CNAME record**
   sesuai instruksi Vercel di panel DNS domain (Hostinger hPanel → DNS Zone) — tidak
   perlu memindahkan nameserver, situs utama sekolah tidak tersentuh.

Deploy berikutnya cukup `npx vercel --prod` dari `app/`, atau otomatis tiap push ke
branch utama bila proyek terhubung ke repo Git.

## Struktur

```
src/lib/vision.ts        primitif pemrosesan citra (Laplacian, Otsu, connected components)
src/lib/analysis.ts      pipeline gate + kalibrasi + ekstraksi fitur
src/lib/rubric.ts        rubrik skor versi-terbuka
src/lib/kappa.ts         kesepakatan mesin–guru (Cohen's kappa)
src/lib/auth.ts          NextAuth (provider "student" & "staff")
prisma/schema.prisma     model data (School → Class → Student → Submission → Score...)
prisma/seed.ts           data demo + sintesis audio TTS
src/app/(public)         beranda, penelitian, tim, untuk sekolah lain
src/app/siswa            sesi baca-simak-tulis-unggah, hasil, latihan, data-saya
src/app/guru             buat sesi, cetak lembar kerja, tinjau hasil, kelas
src/app/koordinator      ringkasan, 15 indikator, bank materi, siswa & persetujuan, log akses
```
