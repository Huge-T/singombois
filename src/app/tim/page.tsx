import { PublicNav } from "@/components/PublicNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ScrollReveal } from "@/components/ScrollReveal";
import { TEAM } from "@/content/team";
import { assetUrl, dokumen } from "@/content/assets";

export const metadata = {
  title: "Tim",
  description:
    "Tim pengelola dan pelaksana inovasi SINGO MBOIS SMP Negeri 27 Malang: enam divisi pelaksana, peneliti, jejaring inovasi, serta unduhan SK dan Buku Panduan Teknis.",
};

interface MitraEntry {
  name: string;
  slug: string | null;
  category?: string;
}

// Sebagian mitra/aktor belum punya logo terunggah — tampilkan nama saja
// untuk yang itu, sama seperti pola placeholder aset lain di situs ini.
function MitraSlider({ items, reverse }: { items: MitraEntry[]; reverse?: boolean }) {
  return (
    <div className="mitra-slider">
      <div className={`mitra-track ${reverse ? "mitra-track-reverse" : ""}`}>
        {[...items, ...items].map((p, i) => {
          const logo = p.slug ? assetUrl(`foto/mitra/${p.slug}.png`) : null;
          return (
            <div className="mitra-item" key={`${p.name}-${i}`}>
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={p.name} />
              ) : (
                <div className="mitra-item-placeholder" aria-hidden="true" />
              )}
              <span>
                {p.name}
                {p.category ? ` · ${p.category}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TimPage() {
  const berkas = dokumen();
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
                {TEAM.divisions.map((d) => {
                  const foto = assetUrl(`foto/tim/${d.slug}.jpg`);
                  return (
                    <div className="kartu" key={d.name}>
                      {foto && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={foto}
                          alt={`Foto ${d.name}`}
                          style={{ width: "100%", borderRadius: 4, marginBottom: 14 }}
                        />
                      )}
                      <h3>{d.name}</h3>
                      <p>{d.role}</p>
                      {d.members.length > 0 && (
                        <p style={{ fontSize: 12.5, color: "var(--tinta-lembut)", marginTop: 10 }}>
                          {d.members.join(" · ")}
                        </p>
                      )}
                    </div>
                  );
                })}
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
              <h2 className="judul-bagian">Instansi jejaring inovasi</h2>
              <p className="pengantar">{TEAM.network.description}</p>
            </div>
            <div className="isi">
              <MitraSlider items={TEAM.network.list} />
            </div>
          </ScrollReveal>
        </section>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">{TEAM.mitraSekolah.title}</p>
              <h2 className="judul-bagian">Sekolah mitra pengembangan</h2>
              <p className="pengantar">{TEAM.mitraSekolah.description}</p>
            </div>
            <div className="isi">
              <MitraSlider items={TEAM.mitraSekolah.schools} reverse />
            </div>
          </ScrollReveal>
        </section>

        <section className="bagian">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">{TEAM.actors.title}</p>
              <h2 className="judul-bagian">Pendukung pengembangan program</h2>
              <p className="pengantar">{TEAM.actors.description}</p>
            </div>
            <div className="isi">
              <MitraSlider items={TEAM.actors.list} />
            </div>
          </ScrollReveal>
        </section>

        <section className="bagian" id="unduhan">
          <ScrollReveal>
            <div className="isi">
              <p className="penunjuk">Unduhan</p>
              <h2 className="judul-bagian">SK &amp; Buku Panduan Teknis</h2>
              <div className="berkas">
                {berkas.map((d) => (
                  <a key={d.nama} href={d.url} target={d.lokal ? undefined : "_blank"} rel="noreferrer">
                    <div>
                      <span className="nama">{d.nama}</span>
                      <span className="ket">{d.ket}</span>
                    </div>
                    <span className="jenis">{d.jenis}</span>
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
