import { PublicNav } from "@/components/PublicNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ScrollReveal } from "@/components/ScrollReveal";
import { GIAT } from "@/content/giat";
import { giatCards } from "@/content/assets";

export const metadata = {
  title: "Giat",
  description:
    "Kegiatan SINGO MBOIS di SMP Negeri 27 Malang: literasi pembiasaan mingguan, bimbingan teknis guru, asesmen literasi, dan analisis kualitas tulisan tangan siswa.",
};

export default function GiatPage() {
  const giat = giatCards();

  return (
    <div>
      <PublicNav active="/giat" />

      <main className="kertas">
        <div className="hero" style={{ paddingBottom: 40 }}>
          <div className="isi">
            <p className="alis">
              Giat <span>· kegiatan program</span>
            </p>
            <h1 className="judul-bagian" style={{ maxWidth: "18ch" }}>
              Giat SINGO MBOIS
            </h1>
            <p className="pengantar" style={{ marginBottom: 0 }}>
              {GIAT.intro}
            </p>
          </div>
        </div>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Empat komponen kegiatan</p>
              <div className="kisi">
                {GIAT.components.map((c, i) => (
                  <div className="kartu" key={c.title}>
                    <p
                      style={{
                        fontFamily: "var(--data)",
                        fontSize: 11,
                        letterSpacing: "0.08em",
                        color: "var(--singo)",
                        marginBottom: 8,
                      }}
                    >
                      KOMPONEN {String(i + 1).padStart(2, "0")}
                    </p>
                    <h3>{c.title}</h3>
                    <p>{c.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Dokumentasi kegiatan</p>
              <h2 className="judul-bagian">Yang sudah berjalan</h2>
              <div className="giat">
                {giat.map((g) => (
                  <div key={g.slug}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {g.foto && <img src={g.foto} alt={g.judul} />}
                    <div className="giat-teks">
                      <small>{g.label}</small>
                      {g.judul}
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: "var(--tinta-lembut)", marginTop: 20 }}>
                {GIAT.activities.join(" · ")}
              </p>
            </div>
          </ScrollReveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
