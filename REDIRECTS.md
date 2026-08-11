# Peta Redirect: Google Sites lama → Situs baru

Deviasi struktur URL disetujui pemilik program (brief redesign, Juli 2026), dengan syarat:
peta redirect terdokumentasi dari SETIAP URL lama ke padanannya, dan tidak ada konten yatim.

Domain produksi belum final (usulan PRD PUB-8: `singombois.sch.id` atau subdomain
`smpnegeri27malang.sch.id`). Placeholder `{BARU}` di bawah diganti domain final saat rilis.

## Peta URL

| # | URL lama (Google Sites) | URL baru | Konten |
|---|---|---|---|
| 1 | `sites.google.com/view/singombois` | `{BARU}/` | Beranda. Body copy ditulis ulang sesuai jurnal (deviasi disetujui); identitas, tautan sosial, dan kontak WhatsApp dipertahankan. |
| 2 | `sites.google.com/view/singombois/tim-singo-mbois` | `{BARU}/tim` | Enam divisi tim, jejaring inovasi, SK, unduhan. |
| 3 | `sites.google.com/view/singombois/giat-singo-mbois` | `{BARU}/giat` | Empat komponen giat + daftar dokumentasi kegiatan. |

## Aset dokumen (embed Drive lama → unduhan baru)

| Aset lama (embed Google Drive) | Lokasi baru |
|---|---|
| SK SINGO MBOIS SMPN 27.pdf | `{BARU}/tim` bagian Unduhan (file di-host di `public/dokumen/` saat tersedia; sementara menaut ke Sites lama, tidak ada konten yatim) |
| Buku Panduan Singo Mbois Fix.pdf | idem |
| Video Tutorial.mp4 | idem |
| Layanan Online (Google Form) | Digantikan alur sesi in-app: `{BARU}/masuk` → `{BARU}/siswa` |

## Konten baru tanpa padanan lama (bukan yatim, ekspansi)

`/program`, `/penelitian`, `/untuk-sekolah-lain`, `/masuk`, area `/siswa`, `/guru`, `/koordinator`.

## Eksekusi

Google Sites **tidak mendukung redirect 301 kustom**. Eksekusi peta ini:

1. Setiap halaman Sites lama diberi banner tautan mencolok "Situs SINGO MBOIS telah pindah"
   menuju padanan barunya (baris tabel di atas), lalu konten lama dikosongkan bertahap.
2. Semua bio sosial (WhatsApp Channel, Instagram, YouTube, Facebook) dan tautan di
   smpnegeri27malang.sch.id diperbarui ke domain baru.
3. Setelah domain final aktif dan Search Console terverifikasi: ajukan penghapusan URL lama
   bila diinginkan, atau biarkan banner pindah tetap hidup (properti Sites tidak membawa
   ekuitas ranking yang signifikan; baseline SEO diperlakukan kosong sesuai audit).
