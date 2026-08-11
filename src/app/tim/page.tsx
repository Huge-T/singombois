import { PublicNav } from "@/components/PublicNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ScrollReveal } from "@/components/ScrollReveal";
import { TEAM, DOWNLOADS } from "@/content/team";

export const metadata = {
  title: "Tim",
  description:
    "Tim pengelola dan pelaksana inovasi SINGO MBOIS SMP Negeri 27 Malang: enam divisi pelaksana, peneliti, jejaring inovasi, serta unduhan SK dan Buku Panduan Teknis.",
};

export default function TimPage() {
  return (
    <div>
      <PublicNav active="/tim" />

      <main className="kertas">
        <div className="hero" style={{ paddingBottom: 40 }}>
          <div className="isi">
            <p className="alis">
              Tim <span>· pengelola &amp; pelaksana inovasi</span>
            </p>
            <h1 className="judul-bagian" style={{ maxWidth: "16ch" }}>
              Tim SINGO MBOIS
            </h1>
            <p className="pengantar" style={{ marginBottom: 0 }}>
              {TEAM.intro}
            </p>
          </div>
        </div>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Enam divisi pelaksana</p>
              <div className="kisi">
                {TEAM.divisions.map((d) => (
                  <div className="kartu" key={d.name}>
                    <h3>{d.name}</h3>
                    <p>{d.role}</p>
                    {d.members.length > 0 && (
                      <p style={{ fontSize: 12.5, color: "var(--tinta-lembut)", marginTop: 10 }}>
                        {d.members.join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Peneliti</p>
              <h2 className="judul-bagian">Penulis jurnal EDUCATUM 4(2)</h2>
              <div className="kisi">
                {TEAM.researchers.map((p) => (
                  <div className="kartu" key={p.name}>
                    <h3>{p.name}</h3>
                    <p>{p.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">{TEAM.network.title}</p>
              <h2 className="judul-bagian">Sekolah mitra pengembangan</h2>
              <p className="pengantar">{TEAM.network.description}</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {TEAM.network.partners.map((p) => (
                  <span key={p} className="pill pill-singo">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>

        <section className="bagian" id="unduhan">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Unduhan</p>
              <h2 className="judul-bagian">SK &amp; Buku Panduan Teknis</h2>
              <div className="berkas">
                {DOWNLOADS.map((d) => (
                  <a key={d.title} href={d.url} target="_blank" rel="noreferrer">
                    <div>
                      <span className="nama">{d.title}</span>
                      <span className="ket">{d.description}</span>
                    </div>
                    <span className="jenis">{d.type}</span>
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
