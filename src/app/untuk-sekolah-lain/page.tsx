import { PublicNav } from "@/components/PublicNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ScrollReveal } from "@/components/ScrollReveal";
import { InterestForm } from "./InterestForm";

export const metadata = {
  title: "Untuk Sekolah Lain",
  description:
    "Cara sekolah lain mengadopsi program literasi SINGO MBOIS: persiapan data kelas, persetujuan wali murid, lembar kerja bergaris, dan sesi percobaan bersama tim SMP Negeri 27 Malang.",
};

export default function UntukSekolahLainPage() {
  return (
    <div>
      <PublicNav active="/untuk-sekolah-lain" />

      <main className="kertas">
        <div className="hero" style={{ paddingBottom: 40 }}>
          <div className="isi">
            <p className="alis">
              Adopsi program <span>· untuk sekolah lain</span>
            </p>
            <h1 className="judul-bagian" style={{ maxWidth: "18ch" }}>
              Menjalankan SINGO MBOIS di sekolah Anda
            </h1>
            <p className="pengantar" style={{ marginBottom: 0 }}>
              Program ini lahir dari satu sekolah dengan penelitian ber-DOI di baliknya. Sekolah
              lain bisa mencoba alur yang sama tanpa membangun dari nol.
            </p>
          </div>
        </div>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <div className="kisi">
                <div className="kartu">
                  <h3>Yang perlu disiapkan</h3>
                  <ul style={{ fontSize: 14, color: "var(--tinta-lembut)", lineHeight: 2, paddingLeft: 18, marginTop: 10 }}>
                    <li>Data kelas &amp; siswa (NISN) untuk diimpor</li>
                    <li>Persetujuan wali murid untuk pengambilan foto lembar kerja</li>
                    <li>Printer untuk lembar kerja bergaris standar</li>
                    <li>1 guru koordinator per angkatan sebagai peninjau skor</li>
                  </ul>
                </div>
                <div className="kartu">
                  <h3>Tahap adopsi</h3>
                  <ol style={{ fontSize: 14, color: "var(--tinta-lembut)", lineHeight: 2, paddingLeft: 18, marginTop: 10 }}>
                    <li>Isi formulir minat di samping</li>
                    <li>Sesi pengenalan dengan tim SINGO MBOIS</li>
                    <li>Impor data kelas &amp; alur persetujuan wali</li>
                    <li>Sesi literasi percobaan (1 kelas, 1 sesi)</li>
                    <li>Tinjau hasil bersama sebelum menjalankan penuh</li>
                  </ol>
                </div>
              </div>

              <p className="penunjuk" style={{ marginTop: 36 }}>
                Daftarkan sekolah Anda
              </p>
              <InterestForm />
            </div>
          </ScrollReveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
