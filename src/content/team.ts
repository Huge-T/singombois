/**
 * Editable content for the public pages, migrated from the old Google Sites
 * (sites.google.com/view/singombois). Kept as data (not hardcoded markup) so
 * the coordinator team can update it without touching page code.
 *
 * Individual member names on the old site were embedded in images without alt
 * text, so they could not be migrated automatically — fill them in per division
 * below (the `members` arrays) from the SK document.
 */
export const TEAM = {
  intro:
    "SINGO MBOIS dikembangkan oleh tim guru SMP Negeri 27 Malang dan berjalan di bawah SK sekolah. Tim terbagi ke dalam enam divisi pelaksana inovasi.",
  divisions: [
    {
      name: "Tim Inti SINGO MBOIS",
      slug: "tim-inti",
      role: "Pengarah program, penyusun kebijakan, dan penanggung jawab inovasi.",
      members: ["A. Rizky Heris T.", "Lulus Agisnia B.", "Moh. Samsudi", "Suyati", "Angga Prasetya N."],
    },
    {
      name: "Tim IT",
      slug: "tim-it",
      role: "Pengelolaan sistem, perangkat, dan infrastruktur digital program.",
      members: ["Sugeng Triyono", "Harianto", "Imam Akbarr D."],
    },
    {
      name: "Tim Analisis",
      slug: "tim-analisis",
      role: "Analisis lembar kerja siswa dan penilaian kualitas tulisan tangan.",
      members: ["Suradji", "Iswarianti", "Laily Isnaini", "Amelia Rohali", "Dina Elisa", "M. Muslikh"],
    },
    {
      name: "Tim Literasi",
      slug: "tim-literasi",
      role: "Penyusunan materi baca-simak-tulis dan pelaksanaan sesi literasi mingguan.",
      members: [
        "M. Kholil",
        "Septiningrum",
        "Ambar Ul Husna",
        "Arif Irfan Fauzi",
        "Ririn Nusantari",
        "Iyus Noviriyanto",
      ],
    },
    {
      name: "Tim Humas",
      slug: "tim-humas",
      role: "Sosialisasi ke siswa, orang tua, dan sekolah mitra.",
      members: ["Titik Trisnawati", "Moch. Shaleh", "Suyanto", "Heppy Ratih W.", "Nurrokhman W."],
    },
    {
      name: "Tim Perlengkapan",
      slug: "tim-perlengkapan",
      role: "Penyiapan lembar kerja, pencetakan, dan logistik kegiatan.",
      members: ["Sastra", "Yalim", "Budi Setiyawan", "Sultan", "Fauzi"],
    },
  ],
  researchers: [
    { name: "R. A. Yudanti", role: "Peneliti · Penulis Jurnal EDUCATUM 4(2)" },
    { name: "R. Pratama", role: "Peneliti · Penulis Jurnal EDUCATUM 4(2)" },
  ],
  network: {
    title: "Jejaring Inovasi",
    description:
      "SINGO MBOIS menjalin kemitraan dengan sekolah-sekolah berikut dalam pengembangan dan uji coba program:",
    partners: ["SMK Mitra", "SMK Diposby", "SMPN 1 Panji Situbondo", "SMPN 10 Probolinggo"],
  },
  sk: {
    label: "SK SINGO MBOIS SMPN 27",
    note: "Dokumen SK tersedia di bagian Unduhan.",
  },
};

/** Downloads migrated from the old Google Sites. Host the files locally at
 *  public/dokumen/ before launch; until then these link to the old site. */
export const DOWNLOADS = [
  {
    title: "SK SINGO MBOIS SMPN 27",
    type: "PDF",
    description: "Surat Keputusan pembentukan tim pelaksana inovasi SINGO MBOIS.",
    url: "https://sites.google.com/view/singombois",
  },
  {
    title: "Buku Panduan Teknis SINGO MBOIS",
    type: "PDF",
    description: "Panduan lengkap pelaksanaan program untuk guru dan sekolah mitra.",
    url: "https://sites.google.com/view/singombois",
  },
  {
    title: "Video Tutorial",
    type: "MP4",
    description: "Tutorial penggunaan layanan SINGO MBOIS.",
    url: "https://sites.google.com/view/singombois",
  },
];

export const CONTACTS = {
  whatsapp: [
    { label: "WhatsApp Tim SINGO MBOIS", number: "+62 851-0007-9717", url: "https://wa.me/6285100079717" },
    { label: "WhatsApp Humas", number: "+62 838-3511-7537", url: "https://wa.me/6283835117537" },
  ],
  socials: [
    {
      label: "Saluran WhatsApp",
      handle: "Kabar dan pengumuman",
      url: "https://whatsapp.com/channel/0029VbBeJQkBPzjcRF6NhN1O",
    },
    { label: "Instagram", handle: "@smpn.27malang", url: "https://instagram.com/smpn.27malang" },
    { label: "YouTube", handle: "@smpn27malangmbois", url: "https://youtube.com/@smpn27malangmbois" },
    { label: "Facebook", handle: "smpn27kotamalang", url: "https://facebook.com/smpn27kotamalang" },
    { label: "Situs sekolah", handle: "smpnegeri27malang.sch.id", url: "https://smpnegeri27malang.sch.id" },
  ],
};
