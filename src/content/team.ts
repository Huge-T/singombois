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
    description: "Sesuai SK, SINGO MBOIS menjalin jejaring dengan instansi pemerintah Kota Malang berikut dalam pengembangan dan sosialisasi program:",
    list: [
      { name: "Dinas Pendidikan dan Kebudayaan Kota Malang", slug: null },
      { name: "BAPPEDA Kota Malang", slug: null },
      { name: "Dinas Sosial P3AP2KB Kota Malang", slug: null },
      { name: "Dinas Komunikasi dan Informatika Kota Malang", slug: null },
      { name: "DISPUSSIPDA Kota Malang", slug: null },
      { name: "Kecamatan Kedungkandang", slug: null },
    ] as { name: string; slug: string | null }[],
  },
  mitraSekolah: {
    title: "Sekolah Mitra",
    description: "SINGO MBOIS menjalin kemitraan dengan sekolah-sekolah berikut sebagai mitra pengembangan dan uji coba program:",
    schools: [
      { name: "SMK Muhammadiyah 1 Taman Sidoarjo", slug: "smk-muhammadiyah-1-taman-sidoarjo" },
      { name: "SMK Diponegoro Surabaya", slug: "smk-diponegoro-surabaya" },
      { name: "SMPN 1 Panji Kabupaten Situbondo", slug: null },
      { name: "SMPN 10 Probolinggo", slug: null },
      { name: "SMPN 1 Kwanyar", slug: null },
      { name: "SMPN 2 Padalarang", slug: null },
      { name: "SD Negeri 1 Pandanajeng", slug: null },
      { name: "SD Negeri Tanjungsari 97", slug: "sdn-tanjungsari-97" },
    ] as { name: string; slug: string | null }[],
  },
  actors: {
    title: "Aktor Inovasi",
    description: "Sesuai SK, pihak-pihak berikut turut mendukung pengembangan dan sosialisasi SINGO MBOIS:",
    list: [
      { name: "Universitas Airlangga", slug: "unair", category: "Akademisi" },
      { name: "Universitas Terbuka", slug: "universitas-terbuka", category: "Akademisi" },
      { name: "Kelurahan Lesanpuro", slug: null, category: "Pemerintah" },
      { name: "PKBM Al-Khadijah", slug: "pkbm-al-khadijah", category: "Organisasi Masyarakat" },
      { name: "PKBM Ki Hadjar Dewantara", slug: "pkbm-ki-hadjar-dewantara", category: "Organisasi Masyarakat" },
      { name: 'SABARO "Sanggar Baca Lesanpuro"', slug: null, category: "Organisasi Masyarakat" },
      { name: "Teras Literasi", slug: "teras-literasi", category: "Organisasi Masyarakat" },
      { name: "Bimbingan Belajar Forum Guru", slug: null, category: "Organisasi Masyarakat" },
      { name: "Komite Sekolah", slug: null, category: "Organisasi Masyarakat" },
      { name: "Radar Malang", slug: null, category: "Media Massa" },
      { name: "CV Kaliurang Berkah Group", slug: null, category: "Dunia Usaha" },
    ] as { name: string; slug: string | null; category: string }[],
  },
  sk: {
    label: "SK SINGO MBOIS SMPN 27",
    note: "Dokumen SK tersedia di bagian Unduhan.",
  },
};

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
