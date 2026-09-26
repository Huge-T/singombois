import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ScrollReveal } from "@/components/ScrollReveal";
import { DemoKemiringan } from "@/components/DemoKemiringan";
import { BarChart } from "@/components/BarChart";
import { StatCounter } from "@/components/StatCounter";
import { CONTACTS } from "@/content/team";
import { dokumen } from "@/content/assets";
import { ActivityBrowser } from "@/components/ActivityBrowser";
import { getRecentActivities } from "@/lib/activities";
import {
  getImpactStats,
  getDailyVisits,
  getClarityByClass,
  getApprovedTestimonials,
} from "@/lib/impact";
import { getApprovedParentReviews, getParentReviewStats } from "@/lib/parentReview";
import { ParentReviewForm } from "@/components/ParentReviewForm";

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "SINGO MBOIS · SMP Negeri 27 Malang",
  alternateName: "Sistem Grafologi Berbasis Literasi Dasar Siswa",
  description:
    "Layanan pengenalan potensi belajar siswa lewat tulisan tangan dari SMP Negeri 27 Malang, dibaca ahli dan didukung pengukuran literasi berbasis penelitian terpublikasi.",
  parentOrganization: {
    "@type": "School",
    name: "SMP Negeri 27 Malang",
    url: "https://smpnegeri27malang.sch.id",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Malang",
    addressRegion: "Jawa Timur",
    addressCountry: "ID",
  },
  sameAs: CONTACTS.socials.map((s) => s.url),
};

export default async function HomePage() {
  const berkas = dokumen();
  const [giat, stats, dailyVisits, clarityByClass, testimonials, parentReviews, parentReviewStats] = await Promise.all([
    getRecentActivities(),
    getImpactStats(),
    getDailyVisits(),
    getClarityByClass(),
    getApprovedTestimonials(),
    getApprovedParentReviews(),
    getParentReviewStats(),
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <PublicNav active="/" />

      <main className="kertas">
        {/* HERO */}
        <div className="hero">
          <div className="isi">
            <p className="alis">
              Inovasi Layanan Siswa <span>· SMP Negeri 27 Malang</span>
            </p>

            <div className="tulisan-wrap">
              <div className="tulisan">Singo Mbois</div>
              <div className="daftar-anno">
                <div className="anno anno-1">
                  miring ke kanan: terbuka, mudah bergaul
                  <svg width="60" height="52" aria-hidden="true">
                    <path d="M2 0 C 14 26, 30 40, 54 48" />
                    <path d="M40 48 L 54 48 L 48 36" />
                  </svg>
                </div>
                <div className="anno anno-2">
                  huruf besar rapat: teliti, suka menyimak
                  <svg width="52" height="46" aria-hidden="true">
                    <path d="M46 0 C 34 22, 20 34, 2 42" />
                    <path d="M12 42 L 2 42 L 6 32" />
                  </svg>
                </div>
                <div className="anno anno-3">
                  garis dasar naik: semangat, optimis
                  <svg width="46" height="44" aria-hidden="true">
                    <path d="M4 42 C 10 22, 22 8, 42 2" />
                    <path d="M42 14 L 42 2 L 30 5" />
                  </svg>
                </div>
              </div>
            </div>

            <h1 className="kepanjangan">
              <em className="sorot">Sistem Grafologi Berbasis Literasi Dasar Siswa.</em>
            </h1>
            <p className="ringkas">
              Tulisan tanganmu menyimpan banyak hal tentang caramu berpikir dan belajar. SINGO
              MBOIS membacanya bersamamu untuk menemukan potensi terbaikmu, lalu memakainya
              supaya belajar terasa lebih pas. Bukan untuk menilai, apalagi menghakimi.
            </p>

            <div className="aksi">
              <a className="tombol tombol-utama" href="#cara">
                Mulai dari sini
              </a>
              <a className="tombol tombol-kedua" href="#berkas">
                Buka buku panduan
              </a>
            </div>
          </div>
        </div>

        {/* GRAFOLOGI */}
        <section className="bagian" id="grafologi">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Apa itu grafologi</p>
              <h2 className="judul-bagian">
                Menemukan potensimu
                <br />
                lewat tulisan tangan.
              </h2>
              <p className="pengantar">
                Cara kamu menulis (kemiringan, ukuran huruf, garis dasar, dan jarak antar kata)
                bisa memberi petunjuk tentang gaya belajar dan kekuatanmu. SINGO MBOIS membacanya
                dengan fokus pada potensi positif: apa yang sudah bagus, dan bagaimana
                memanfaatkannya. Coba geser pilihannya, lihat apa yang berubah.
              </p>

              <DemoKemiringan />

              <p className="pengantar" style={{ marginTop: 28, marginBottom: 0, fontSize: 14 }}>
                Ini hanya gambaran singkat. Pembacaan sebenarnya dilakukan tim ahli SINGO MBOIS
                terhadap tulisanmu sendiri, bukan lewat contoh di layar, dan hasilnya bisa kamu
                diskusikan langsung lewat layanan konsultasi.{" "}
                <Link href="/metode" style={{ fontWeight: 700 }}>
                  Pelajari metodenya →
                </Link>
              </p>
            </div>
          </ScrollReveal>
        </section>

        {/* CARA IKUT */}
        <section className="bagian" id="cara">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Alur layanan</p>
              <h2 className="judul-bagian">Cara ikut SINGO MBOIS</h2>
              <p className="pengantar">
                Lima tahap, dikerjakan berurutan bersama wali kelas dan tim SINGO MBOIS.
              </p>
              <ol className="langkah">
                <li>
                  <span className="no">1</span>
                  <div>
                    <h3>Sosialisasi di kelas</h3>
                    <p>
                      Tim menjelaskan tujuan layanan ke siswa dan wali kelas. Tidak ada nilai,
                      tidak ada benar-salah.
                    </p>
                  </div>
                </li>
                <li>
                  <span className="no">2</span>
                  <div>
                    <h3>Sesi literasi</h3>
                    <p>
                      Kamu membaca sebuah teks dan menyimak audio, lalu menuliskan kembali isinya
                      dengan tulisan tangan sendiri. Tulis senyaman biasanya. Boleh juga
                      menggambar bila diminta.
                    </p>
                  </div>
                </li>
                <li>
                  <span className="no">3</span>
                  <div>
                    <h3>Unggah lewat akunmu</h3>
                    <p>
                      Foto lembar kerjamu dan unggah setelah masuk dengan akunmu. Hasilnya
                      bersifat pribadi: hanya kamu dan Guru BK yang bisa melihatnya.
                    </p>
                  </div>
                </li>
                <li>
                  <span className="no">4</span>
                  <div>
                    <h3>Pembacaan oleh ahli</h3>
                    <p>
                      Tim ahli membaca tulisanmu dengan fokus pada potensi positifmu, didampingi
                      Guru BK. Sistem juga mengukur perkembangan literasimu secara otomatis.
                    </p>
                  </div>
                </li>
                <li>
                  <span className="no">5</span>
                  <div>
                    <h3>Hasil dan konsultasi</h3>
                    <p>
                      Kamu menerima gambaran potensi belajarmu beserta saran cara belajar yang
                      paling cocok. Ada yang mau ditanyakan? Buka tiket konsultasi atau hubungi
                      hotline tim.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </ScrollReveal>
        </section>

        {/* MANFAAT */}
        <section className="bagian" id="manfaat">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Manfaat</p>
              <h2 className="judul-bagian">Satu tulisan, tiga sudut pandang</h2>
              <p className="pengantar">
                SINGO MBOIS dibuat untuk dipakai bertiga: siswa, guru, dan orang tua membaca hal
                yang sama tentang anak yang sama.
              </p>
              <div className="kisi">
                <div className="kartu siswa">
                  <h3>Untuk siswa</h3>
                  <p>
                    Tahu cara belajar yang paling nyaman buat dirimu, dan tahu ke arah mana
                    kemampuanmu bisa diasah supaya berprestasi.
                  </p>
                </div>
                <div className="kartu guru">
                  <h3>Untuk guru</h3>
                  <p>
                    Punya bacaan tambahan tentang potensi dan kondisi belajar siswa, sehingga
                    pendampingan di kelas bisa lebih tepat sasaran.
                  </p>
                </div>
                <div className="kartu">
                  <h3>Untuk orang tua</h3>
                  <p>
                    Mengenali anak dari sisi yang jarang terlihat di rumah, dan tahu dukungan
                    seperti apa yang dibutuhkan saat ia belajar.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* BERKAS */}
        <section className="bagian" id="berkas">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Berkas dan panduan</p>
              <h2 className="judul-bagian">Unduh yang kamu butuhkan</h2>
              <p className="pengantar">
                Dokumen resmi layanan SINGO MBOIS. Baca panduan teknis sebelum menjalankan tes di
                kelas.
              </p>
              <div className="berkas">
                {berkas.map((b) => (
                  <a key={b.nama} href={b.url} target={b.lokal ? undefined : "_blank"} rel="noreferrer">
                    <div>
                      <span className="nama">{b.nama}</span>
                      <span className="ket">{b.ket}</span>
                    </div>
                    <span className="jenis">{b.jenis}</span>
                  </a>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* TIM */}
        <section className="bagian" id="tim">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Tim</p>
              <h2 className="judul-bagian">
                Dibuat oleh guru
                <br />
                SMP Negeri 27 Malang
              </h2>
              <p className="pengantar">
                SINGO MBOIS lahir dari tim guru SMP Negeri 27 Malang sebagai gerakan inovasi
                layanan siswa, dan didukung penelitian yang terbit di jurnal ber-DOI. Susunan
                lengkap tim beserta surat keputusannya ada di halaman tim.
              </p>
              <div className="aksi">
                <Link className="tombol tombol-kedua" href="/tim">
                  Lihat seluruh tim
                </Link>
                <Link className="tombol tombol-kedua" href="/penelitian">
                  Baca penelitiannya
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* GIAT */}
        <section className="bagian" id="giat">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Giat</p>
              <h2 className="judul-bagian">Yang sudah berjalan</h2>
              <p className="pengantar">Catatan kegiatan SINGO MBOIS di lingkungan sekolah.</p>
              <ActivityBrowser activities={giat} showTabs={false} />
              <p style={{ marginTop: 20 }}>
                <Link href="/giat" className="tombol tombol-kedua tombol-kecil">
                  Lihat semua kegiatan
                </Link>
              </p>
            </div>
          </ScrollReveal>
        </section>

        {/* KEMANFAATAN */}
        <section className="bagian" id="kemanfaatan">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Kemanfaatan</p>
              <h2 className="judul-bagian">Sejauh mana sudah terpakai</h2>
              <p className="pengantar">
                Inovasi baru berarti kalau benar-benar dipakai. Semua angka di bawah ini dihitung
                langsung dari data aplikasi ini, tidak ada yang diketik manual. Penghitung
                kunjungan berjalan sendiri di situs ini, tanpa layanan pihak ketiga.
              </p>

              <div className="ubin-kisi">
                <div className="ubin">
                  <p className="ubin-v">
                    <StatCounter value={stats.studentsServed} />
                  </p>
                  <h3>Siswa terlayani</h3>
                  <p>Sudah menjalani sesi dan menerima pembacaan hasil.</p>
                </div>
                <div className="ubin">
                  <p className="ubin-v">
                    <StatCounter value={stats.classesInProgram} />
                  </p>
                  <h3>Rombongan belajar</h3>
                  <p>Kelas yang sudah masuk program, dari kelas VII sampai IX.</p>
                </div>
                <div className="ubin">
                  <p className="ubin-v">
                    <StatCounter value={stats.feedbackCount} />
                  </p>
                  <h3>Tanggapan masuk</h3>
                  <p>Isian angket siswa setelah mencoba SINGO MBOIS.</p>
                </div>
                <div className="ubin ubin-stempel">
                  <p className="ubin-v">
                    <StatCounter value={stats.visitCount} />
                  </p>
                  <h3>Kunjungan halaman</h3>
                  <p>Total kunjungan ke website SINGO MBOIS sejak diluncurkan.</p>
                </div>
              </div>

              <div className="grafik-kisi">
                <div className="kartu">
                  <h3 style={{ marginBottom: 14 }}>Kunjungan per hari</h3>
                  <BarChart
                    title="Kunjungan situs per hari, empat belas hari terakhir"
                    data={dailyVisits.map((d) => ({
                      label: d.label,
                      value: d.count,
                      detail: `${d.label}: ${d.count} kunjungan`,
                    }))}
                  />
                </div>
                {clarityByClass.length > 0 && (
                  <div className="kartu">
                    <h3 style={{ marginBottom: 4 }}>Paham cara belajar, per kelas</h3>
                    <p style={{ fontSize: 12, color: "var(--tinta-lembut)", marginBottom: 10 }}>
                      Rata-rata jawaban angket, skala 1 sampai 5. Kelas tampil bila tanggapannya
                      sudah tiga atau lebih.
                    </p>
                    <BarChart
                      title="Rata-rata skor paham cara belajar per kelas, skala 1 sampai 5"
                      maxScale={5}
                      data={clarityByClass.map((c) => ({
                        label: c.className,
                        value: Math.round(c.average * 10) / 10,
                        detail: `${c.className}: rata-rata ${c.average.toFixed(1)} dari ${c.n} tanggapan`,
                      }))}
                    />
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* TANGGAPAN SISWA */}
        <section className="bagian" id="tanggapan">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Tanggapan siswa</p>
              <h2 className="judul-bagian">
                Kata mereka yang
                <br />
                sudah mencoba
              </h2>
              <p className="pengantar">
                Setiap siswa yang selesai menjalani SINGO MBOIS diminta mengisi angket singkat.
                Tanggapan yang masuk dibaca tim, dan yang diizinkan tampil kami pasang apa adanya
                di sini.
              </p>

              {testimonials.length > 0 ? (
                <div className="testimoni-kisi">
                  {testimonials.map((t, i) => (
                    <figure className={`testimoni ${i % 2 === 1 ? "miring-kanan" : "miring-kiri"}`} key={t.id}>
                      <blockquote>{t.impression}</blockquote>
                      <figcaption>{t.attribution}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <div className="testimoni-kosong">
                  Tanggapan siswa akan tampil di sini setelah angket pertama disetujui tim.
                </div>
              )}

              <div className="kartu" style={{ marginTop: 28, borderTopColor: "var(--singo)" }}>
                <h3>Sudah ikut? Ceritakan pengalamanmu.</h3>
                <p style={{ marginBottom: 14 }}>
                  Lima pertanyaan, sekitar dua menit, langsung dari akunmu setelah sesi selesai.
                  Boleh pakai nama, boleh tanpa nama, kamu yang pilih di formulirnya.
                </p>
                <Link className="tombol tombol-utama tombol-kecil" href="/masuk">
                  Masuk dan isi angket
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ULASAN ORANG TUA */}
        <section className="bagian" id="ulasan-orang-tua">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Ulasan orang tua</p>
              <h2 className="judul-bagian">
                Apa kata orang tua
                <br />
                &amp; wali murid?
              </h2>
              <p className="pengantar">
                Orang tua/wali murid siswa yang ikut SINGO MBOIS boleh memberi ulasan langsung di
                sini, tanpa perlu akun. Ulasan yang masuk dibaca tim dulu sebelum tayang.
              </p>

              {parentReviewStats.count > 0 && (
                <p style={{ fontSize: 14, marginBottom: 20 }}>
                  <strong>{parentReviewStats.average?.toFixed(1)}</strong> dari {parentReviewStats.count} ulasan
                </p>
              )}

              {parentReviews.length > 0 ? (
                <div className="testimoni-kisi">
                  {parentReviews.map((r, i) => (
                    <figure className={`testimoni ${i % 2 === 1 ? "miring-kanan" : "miring-kiri"}`} key={r.id}>
                      <p style={{ color: "var(--singo)", marginBottom: 6 }}>
                        {"★".repeat(r.rating)}
                        <span style={{ color: "var(--garis)" }}>{"★".repeat(5 - r.rating)}</span>
                      </p>
                      <blockquote>{r.comment}</blockquote>
                      <figcaption>{r.name}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <div className="testimoni-kosong">Ulasan orang tua akan tampil di sini setelah disetujui tim.</div>
              )}

              <div style={{ marginTop: 28 }}>
                <ParentReviewForm />
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* KONTAK */}
        <section className="bagian" id="kontak">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Kontak &amp; hotline</p>
              <h2 className="judul-bagian">Ada yang mau ditanyakan?</h2>
              <p className="pengantar">
                Hubungi hotline tim lewat WhatsApp untuk konsultasi atau validasi hasil, atau
                ikuti kabar terbaru SINGO MBOIS dan SMP Negeri 27 Malang di kanal berikut.
              </p>
              <div className="kontak-kisi">
                {CONTACTS.whatsapp.map((w) => (
                  <a key={w.number} href={w.url} target="_blank" rel="noreferrer">
                    <strong>Hotline WhatsApp</strong>
                    <span>{w.number}</span>
                  </a>
                ))}
                {CONTACTS.socials.map((s) => (
                  <a key={s.label} href={s.url} target="_blank" rel="noreferrer">
                    <strong>{s.label}</strong>
                    <span>{s.handle}</span>
                  </a>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
