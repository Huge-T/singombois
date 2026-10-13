import { DistRows } from "@/components/rekap/DistRows";
import { GESTALT_DISCLAIMER } from "@/lib/gestalt";
import type { PublicRecap } from "@/lib/rekap";

/** Ringkasan kecenderungan siswa untuk beranda publik. Hanya agregat sekolah
 *  (tanpa nama/kelas), hanya yang sudah divalidasi Guru BK, dan hanya variabel
 *  dengan sampel & cakupan memadai (lihat getPublicRecapSummary). */
export function RekapPublik({ data }: { data: PublicRecap }) {
  return (
    <>
      <p className="penunjuk">Gambaran siswa</p>
      <h2 className="judul-bagian">Apa yang terbaca dari tulisan siswa</h2>
      <p className="pengantar">
        Rangkuman dari {data.students} siswa yang tulisan tangannya sudah dibaca dan divalidasi Guru BK. Angkanya
        dihitung otomatis dan bisa berubah seiring bertambahnya siswa yang ikut. Tidak ada nama atau kelas yang
        ditampilkan.
      </p>
      <div className="rekap-publik-kisi">
        {data.variables.map((v) => (
          <div className="kartu" key={v.variable}>
            <h3>{v.label}</h3>
            <p className="hint">Dari {v.measured} siswa yang terukur</p>
            <DistRows shares={v.shares} compact />
          </div>
        ))}
      </div>
      <p className="pengantar" style={{ marginTop: 22, marginBottom: 0, fontSize: 13 }}>
        {GESTALT_DISCLAIMER}
      </p>
    </>
  );
}
