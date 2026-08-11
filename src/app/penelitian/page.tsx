import { PublicNav } from "@/components/PublicNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ScrollReveal } from "@/components/ScrollReveal";
import { BASELINE_INDICATORS, PROGRAM_EFFECTIVENESS, STUDY_SAMPLE_N } from "@/content/indicators";

export const metadata = {
  title: "Penelitian",
  description:
    "Dasar ilmiah SINGO MBOIS: studi terpublikasi Yudanti & Pratama (2026) di EDUCATUM 4(2) mengukur 15 indikator literasi pada 288 siswa SMP Negeri 27 Malang. DOI 10.59165/educatum.v4i2.224.",
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "ScholarlyArticle",
  headline:
    "Efektivitas sistem grafologi berbasis literasi dasar siswa (SINGO MBOIS) di SMP Negeri 27 Malang dalam mendukung program literasi sekolah",
  author: [
    { "@type": "Person", name: "R. A. Yudanti" },
    { "@type": "Person", name: "R. Pratama" },
  ],
  datePublished: "2026",
  isPartOf: {
    "@type": "PublicationIssue",
    issueNumber: "2",
    isPartOf: {
      "@type": "PublicationVolume",
      volumeNumber: "4",
      isPartOf: { "@type": "Periodical", name: "EDUCATUM" },
    },
  },
  pagination: "77-81",
  identifier: {
    "@type": "PropertyValue",
    propertyID: "DOI",
    value: "10.59165/educatum.v4i2.224",
  },
  url: "https://doi.org/10.59165/educatum.v4i2.224",
  inLanguage: "id",
};

export default function PenelitianPage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <PublicNav active="/penelitian" />

      <main className="kertas">
        <div className="hero" style={{ paddingBottom: 40 }}>
          <div className="isi">
            <p className="alis">
              Dasar ilmiah <span>· jurnal ber-DOI</span>
            </p>
            <h1 className="judul-bagian" style={{ maxWidth: "18ch" }}>
              Penelitian di balik SINGO MBOIS
            </h1>
            <p className="pengantar" style={{ marginBottom: 0 }}>
              Program ini bukan sekadar ide. Efektivitasnya diteliti pada {STUDY_SAMPLE_N} siswa
              dan terbit di jurnal ilmiah ber-DOI pada 2026.
            </p>
          </div>
        </div>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Sitasi</p>
              <div className="kartu" style={{ borderTopColor: "var(--singo)", maxWidth: 760 }}>
                <p style={{ fontSize: 15.5, lineHeight: 1.7, color: "var(--tinta-lembut)", marginBottom: 14 }}>
                  Yudanti, R. A. &amp; Pratama, R. (2026).{" "}
                  <cite>
                    Efektivitas sistem grafologi berbasis literasi dasar siswa (SINGO MBOIS) di
                    SMP Negeri 27 Malang dalam mendukung program literasi sekolah.
                  </cite>{" "}
                  EDUCATUM, 4(2), 77-81.
                </p>
                <div className="aksi">
                  <a
                    className="tombol tombol-utama tombol-kecil"
                    href="https://doi.org/10.59165/educatum.v4i2.224"
                    target="_blank"
                    rel="noreferrer"
                  >
                    DOI 10.59165/educatum.v4i2.224
                  </a>
                  <a
                    className="tombol tombol-kedua tombol-kecil"
                    href="https://ojs.jurnalbk.com/index.php/educatum/article/view/224"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Unduh PDF di jurnal
                  </a>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Temuan</p>
              <h2 className="judul-bagian">15 indikator, efektivitas {PROGRAM_EFFECTIVENESS}%</h2>
              <p className="pengantar">
                Studi mengukur 15 indikator literasi dasar dengan rata-rata efektivitas{" "}
                {PROGRAM_EFFECTIVENESS}% (kategori tinggi). Dua indikator tertinggal dan menjadi
                fokus pengembangan aplikasi ini: kerapian tulisan tangan (67%) dan menyimak audio
                (70%).
              </p>

              <table className="ind" style={{ maxWidth: 760 }}>
                <thead>
                  <tr>
                    <th>Indikator</th>
                    <th className="n" style={{ width: 110 }}>
                      Baseline 2026
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {BASELINE_INDICATORS.map((ind) => (
                    <tr key={ind.code} className={ind.value < 72 ? "flag" : ""}>
                      <td>{ind.label}</td>
                      <td className="n">{ind.value}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 12.5, color: "var(--tinta-lembut)", marginTop: 10 }}>
                n = {STUDY_SAMPLE_N}. Baris bertanda merah adalah indikator terlemah yang menjadi
                prioritas.
              </p>
            </div>
          </ScrollReveal>
        </section>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Dua lapis layanan</p>
              <h2 className="judul-bagian">Yang diukur dan yang dibaca</h2>
              <p className="pengantar">
                SINGO MBOIS berjalan di dua lapis yang sengaja dibedakan supaya keduanya jujur
                pada porsinya masing-masing.
              </p>
              <div className="kisi">
                <div className="kartu siswa">
                  <h3>Lapis terukur: literasi</h3>
                  <p>
                    Kemampuan membaca, menyimak, dan kualitas teknis tulisan (kerapian,
                    konsistensi, jarak) diukur otomatis dengan satuan nyata dan ditinjau guru.
                    Lapis inilah yang diteliti di jurnal EDUCATUM: 15 indikator dengan baseline
                    yang dipantau berkelanjutan.
                  </p>
                </div>
                <div className="kartu guru">
                  <h3>Lapis interpretatif: potensi</h3>
                  <p>
                    Pembacaan karakter belajar dari tulisan dan gambar dilakukan tim ahli bersama
                    Guru BK, berfokus pada potensi positif siswa. Lapis ini bersifat
                    interpretatif dan memotivasi, selalu bisa dikonsultasikan, dan tidak dipakai
                    untuk penjurusan, seleksi, sanksi, atau peringkat.
                  </p>
                </div>
              </div>
              <p className="pengantar" style={{ marginTop: 26, marginBottom: 0, fontSize: 14.5 }}>
                Literatur yang dirujuk studi (Graham 2020; Santangelo &amp; Graham 2021;
                Rosenblum 2018, 2021) membahas keterampilan menulis dan motorik halus. Karena
                itu klaim lapis terukur dibatasi pada keterbacaan, kerapian, ukuran huruf, dan
                konsistensi, sementara pembacaan potensi ditempatkan sebagai layanan pendampingan
                oleh manusia, bukan hasil pengukuran ilmiah.
              </p>
            </div>
          </ScrollReveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
