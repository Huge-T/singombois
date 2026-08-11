import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ScrollReveal } from "@/components/ScrollReveal";
import { DemoKemiringan } from "@/components/DemoKemiringan";
import { METODE } from "@/content/metode";
import { CONTACTS } from "@/content/team";

export const metadata = {
  title: "Metode Grafologi",
  description:
    "Cara SINGO MBOIS membaca karakter belajar siswa lewat tulisan tangan dan gambar: elemen yang dibaca, fokus potensi positif, proses pembacaan oleh ahli, serta etika dan batasannya.",
};

export default function MetodePage() {
  return (
    <div>
      <PublicNav active="/metode" />

      <main className="kertas">
        <div className="hero" style={{ paddingBottom: 56 }}>
          <div className="isi">
            <p className="alis">
              Metode <span>· Grafologi SINGO MBOIS</span>
            </p>
            <h1 className="judul-bagian" style={{ maxWidth: "18ch" }}>
              Membaca potensimu lewat tulisan dan gambarmu.
            </h1>
            <p className="pengantar" style={{ marginBottom: 28 }}>
              {METODE.intro}
            </p>
            <div className="aksi">
              <Link className="tombol tombol-utama" href="/masuk">
                Masuk dan unggah karyamu
              </Link>
              <a
                className="tombol tombol-kedua"
                href={CONTACTS.whatsapp[0].url}
                target="_blank"
                rel="noreferrer"
              >
                Tanya hotline dulu
              </a>
            </div>
          </div>
        </div>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Dari tulisan kalimat</p>
              <h2 className="judul-bagian">Lima hal yang dibaca ahli</h2>
              <p className="pengantar">
                Setiap elemen dibaca sebagai petunjuk potensi, bukan vonis. Tidak ada gaya tulisan
                yang salah.
              </p>
              <div className="kisi">
                {METODE.elemenTulisan.map((e) => (
                  <div className="kartu siswa" key={e.nama}>
                    <h3>{e.nama}</h3>
                    <p style={{ marginBottom: 10 }}>{e.apa}</p>
                    <p style={{ fontSize: 14, color: "var(--tinta)" }}>
                      <b>Potensinya:</b> {e.potensi}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Dari gambar</p>
              <h2 className="judul-bagian">Kalau kamu lebih suka menggambar</h2>
              <p className="pengantar">
                Karya gambar juga bisa dibaca. Yang dilihat bukan bagus-jeleknya gambar, melainkan
                apa yang gambar itu ceritakan tentang caramu berekspresi.
              </p>
              <div className="kisi">
                {METODE.elemenGambar.map((e) => (
                  <div className="kartu" key={e.nama}>
                    <h3>{e.nama}</h3>
                    <p style={{ marginBottom: 10 }}>{e.apa}</p>
                    <p style={{ fontSize: 14, color: "var(--tinta)" }}>
                      <b>Potensinya:</b> {e.potensi}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Coba rasakan</p>
              <h2 className="judul-bagian">Contoh kecil: kemiringan tulisan</h2>
              <p className="pengantar">
                Geser pilihannya dan lihat bagaimana satu elemen bisa dibaca sebagai potensi.
              </p>
              <DemoKemiringan />
            </div>
          </ScrollReveal>
        </section>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Prosesnya</p>
              <h2 className="judul-bagian">Dari kertas sampai konsultasi</h2>
              <ol className="langkah" style={{ marginTop: 30 }}>
                {METODE.proses.map((p, i) => (
                  <li key={i}>
                    <span className="no">{i + 1}</span>
                    <div>
                      <p style={{ color: "var(--tinta)", fontWeight: 500 }}>{p}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </ScrollReveal>
        </section>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Etika dan batasan</p>
              <h2 className="judul-bagian">Janji kami padamu</h2>
              <p className="pengantar">
                Supaya layanan ini tetap sehat dan memotivasi, tim memegang aturan berikut.
              </p>
              <ol className="langkah">
                {METODE.etika.map((e, i) => (
                  <li key={i}>
                    <span className="no" style={{ color: "var(--pena-merah)", fontSize: 22 }}>
                      ✓
                    </span>
                    <div>
                      <p style={{ color: "var(--tinta)" }}>{e}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </ScrollReveal>
        </section>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Tanya jawab</p>
              <h2 className="judul-bagian">Yang sering ditanyakan</h2>
              <div className="kisi" style={{ marginTop: 30 }}>
                {METODE.faq.map((f) => (
                  <div className="kartu" key={f.q}>
                    <h3>{f.q}</h3>
                    <p>{f.a}</p>
                  </div>
                ))}
              </div>
              <div className="aksi" style={{ marginTop: 36 }}>
                <a
                  className="tombol tombol-utama"
                  href={CONTACTS.whatsapp[0].url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Hotline WhatsApp tim
                </a>
                <Link className="tombol tombol-kedua" href="/penelitian">
                  Lihat dasar penelitiannya
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
