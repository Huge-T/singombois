import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ScrollReveal } from "@/components/ScrollReveal";

export const metadata = {
  title: "Cara Ikut",
  description:
    "Alur layanan SINGO MBOIS di SMP Negeri 27 Malang: sosialisasi, sesi literasi baca-simak-tulis, unggah karya lewat akun pribadi, pembacaan oleh ahli, lalu hasil dan konsultasi.",
};

export default function ProgramPage() {
  return (
    <div>
      <PublicNav active="/program" />

      <main className="kertas">
        <div className="hero" style={{ paddingBottom: 40 }}>
          <div className="isi">
            <p className="alis">
              Alur layanan <span>· dari kelas sampai konsultasi</span>
            </p>
            <h1 className="judul-bagian" style={{ maxWidth: "16ch" }}>
              Cara ikut SINGO MBOIS
            </h1>
            <p className="pengantar" style={{ marginBottom: 0 }}>
              Satu sesi lengkap: membaca teks, menyimak audio, menulis tangan di kertas, lalu
              mengunggah karyamu lewat akun pribadi. Semua berjalan bersama wali kelas dan tim
              SINGO MBOIS.
            </p>
          </div>
        </div>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Tahap 1 · Baca</p>
              <h2 className="judul-bagian">Teks sesuai tingkat kelasmu</h2>
              <p className="pengantar" style={{ marginBottom: 0 }}>
                Kamu membaca teks di layar dengan huruf besar dan jarak baris longgar. Waktu
                bacamu terekam otomatis, jadi gurumu tahu ritme bacamu tanpa menebak-nebak.
              </p>
            </div>
          </ScrollReveal>
        </section>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Tahap 2 · Simak</p>
              <h2 className="judul-bagian">Audio yang sudah lolos uji dengar</h2>
              <p className="pengantar" style={{ marginBottom: 0 }}>
                Audio yang diterbitkan wajib lolos uji dengar koordinator sebelum dipakai siswa.
                Pengulangan dibatasi dua kali dan dicatat. Jika banyak siswa mengulang di bagian
                yang sama, bagian itu kemungkinan yang membingungkan, bukan siswanya yang kurang
                fokus.
              </p>
            </div>
          </ScrollReveal>
        </section>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Tahap 3 · Tulis dan unggah</p>
              <h2 className="judul-bagian">Tetap di kertas, senyaman gayamu</h2>
              <p className="pengantar">
                Jawaban ditulis tangan di kertas bergaris, karena tulisan tanganmulah yang
                dibaca. Boleh juga karya gambar. Setelah selesai, foto lembarmu dan unggah
                setelah masuk akun. Sistem menolak foto yang buram atau gelap daripada memaksakan
                pembacaan dari foto yang tidak layak.
              </p>
              <div className="kisi">
                <div className="kartu siswa">
                  <h3>Hasilnya pribadi</h3>
                  <p>
                    Hasil pembacaan karaktermu hanya bisa dibuka oleh kamu dan Guru BK. Tidak
                    tampil ke teman sekelas, tidak dipakai untuk peringkat.
                  </p>
                </div>
                <div className="kartu guru">
                  <h3>Dibaca ahli, bukan mesin</h3>
                  <p>
                    Mesin hanya membantu mengukur sisi teknis (kerapian, jarak, konsistensi).
                    Pembacaan potensimu ditulis oleh tim ahli dan Guru BK.
                  </p>
                </div>
                <div className="kartu">
                  <h3>Bisa dikonsultasikan</h3>
                  <p>
                    Setiap hasil bisa ditanyakan lewat tiket konsultasi di akunmu atau hotline
                    WhatsApp tim.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Siap mulai?</p>
              <h2 className="judul-bagian">Masuk dan kerjakan sesimu</h2>
              <div className="aksi" style={{ marginTop: 24 }}>
                <Link className="tombol tombol-utama" href="/masuk">
                  Masuk sebagai siswa
                </Link>
                <Link className="tombol tombol-kedua" href="/metode">
                  Pelajari metodenya dulu
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
