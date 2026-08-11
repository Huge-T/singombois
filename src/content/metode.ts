/**
 * Materi pendukung metode pembacaan karakter lewat tulisan tangan.
 * Fokus editorial (keputusan pemilik program, Juli 2026): POTENSI POSITIF
 * siswa untuk memotivasi; sisi yang perlu perhatian boleh disebut, tapi bukan
 * fokus. Pembacaan dilakukan ahli manusia dan bisa dikonsultasikan, bukan
 * vonis otomatis mesin.
 */
export const METODE = {
  intro:
    "SINGO MBOIS membaca karakter belajar siswa lewat karya tulisan tangannya sendiri: bisa berupa tulisan kalimat, bisa juga gambar. Fokus pembacaannya satu: menemukan potensi positif siswa, lalu mengubahnya jadi cara belajar yang cocok. Pembacaan dilakukan tim ahli bersama Guru BK, dan setiap siswa bisa bertanya atau meminta validasi hasilnya lewat layanan konsultasi.",

  elemenTulisan: [
    {
      nama: "Kemiringan tulisan",
      apa: "Arah condong huruf: ke kanan, tegak, atau ke kiri.",
      potensi:
        "Condong kanan sering menandai keterbukaan dan kenyamanan bekerja sama; tegak menandai ketenangan menimbang; condong kiri menandai kekuatan berpikir mandiri. Ketiganya potensi, tidak ada yang lebih baik.",
    },
    {
      nama: "Ukuran huruf",
      apa: "Besar-kecil huruf dan seberapa stabil ukurannya dari awal sampai akhir.",
      potensi:
        "Huruf besar sering menyertai keberanian tampil; huruf kecil yang stabil sering menyertai fokus dan ketelitian pada detail.",
    },
    {
      nama: "Garis dasar",
      apa: "Garis bayangan tempat huruf berdiri: naik, rata, atau menurun sepanjang baris.",
      potensi:
        "Garis dasar yang naik sering menandai energi dan optimisme saat mengerjakan. Garis yang rata menandai kestabilan ritme kerja.",
    },
    {
      nama: "Jarak kata dan margin",
      apa: "Seberapa lega jarak antar kata dan seberapa tertib awal barisnya.",
      potensi:
        "Jarak yang tertata menandai kemampuan mengatur ruang dan rencana; margin yang rapi menandai kebiasaan kerja yang tertib.",
    },
    {
      nama: "Tebal-tipis goresan",
      apa: "Kesan tekanan yang terlihat dari gelap-terangnya goresan pena.",
      potensi:
        "Goresan mantap sering menyertai keyakinan dan daya juang; goresan ringan sering menyertai kepekaan dan kehati-hatian.",
    },
  ],

  elemenGambar: [
    {
      nama: "Tema gambar",
      apa: "Apa yang dipilih siswa untuk digambar ketika diberi kebebasan.",
      potensi: "Tema menunjukkan minat dan hal yang sedang penting bagi siswa: pintu masuk percakapan pendampingan.",
    },
    {
      nama: "Komposisi dan ukuran",
      apa: "Penempatan objek di bidang kertas dan proporsinya.",
      potensi:
        "Komposisi yang memenuhi bidang sering menyertai rasa percaya diri berekspresi; detail kecil yang telaten menandai kesabaran.",
    },
    {
      nama: "Penekanan dan pengulangan",
      apa: "Bagian yang digambar paling tebal, paling besar, atau diulang-ulang.",
      potensi: "Penekanan menunjukkan hal yang paling bermakna bagi siswa: bahan diskusi yang baik bersama Guru BK.",
    },
  ],

  proses: [
    "Siswa menulis atau menggambar di lembar kerja, senyaman gaya sendiri, tanpa dinilai benar-salah.",
    "Karya difoto dan diunggah lewat akun siswa. Sistem membantu mengukur sisi teknis (kerapian, konsistensi, jarak) secara otomatis.",
    "Tim ahli membaca karya secara utuh dan menuliskan potensi positif siswa beserta saran cara belajar.",
    "Hasil terbit di akun siswa, bersifat pribadi: hanya siswa itu dan Guru BK yang bisa membukanya.",
    "Siswa bisa bertanya atau meminta validasi lewat tiket konsultasi atau hotline WhatsApp.",
  ],

  etika: [
    "Pembacaan bersifat interpretatif dan memotivasi, bukan diagnosis psikologis atau vonis kepribadian.",
    "Fokus pada potensi positif. Bila ada hal yang perlu perhatian, disampaikan sebagai saran pendampingan, bukan label.",
    "Hasil tidak dipakai untuk penjurusan, seleksi, sanksi, atau peringkat siswa.",
    "Hasil bersifat personal: hanya siswa yang bersangkutan dan Guru BK yang dapat mengaksesnya.",
    "Setiap hasil selalu bisa didiskusikan dan divalidasi ulang bersama ahli lewat layanan konsultasi.",
    "Terpisah dari itu, perkembangan literasi (membaca, menyimak, menulis) diukur dengan metode terukur yang diteliti di jurnal EDUCATUM 4(2) 2026.",
  ],

  faq: [
    {
      q: "Apakah hasilnya menentukan masa depanku?",
      a: "Tidak. Hasil ini gambaran potensimu saat ini untuk membantu cara belajarmu, bukan ramalan dan bukan penentu apa pun. Kamu yang menentukan masa depanmu.",
    },
    {
      q: "Kalau aku tidak setuju dengan hasilnya?",
      a: "Sampaikan lewat tiket konsultasi atau langsung ke Guru BK. Pembacaan bisa didiskusikan dan diperbaiki: justru itu gunanya layanan konsultasi.",
    },
    {
      q: "Siapa saja yang bisa melihat hasilku?",
      a: "Hanya kamu dan Guru BK. Wali kelas hanya melihat perkembangan literasimu (skor membaca, menyimak, kerapian tulisan), bukan hasil pembacaan karaktermu.",
    },
    {
      q: "Tulisanku jelek, apa aku akan dinilai buruk?",
      a: "Tidak ada tulisan jelek di sini. Setiap gaya tulisan justru bahan untuk menemukan kekuatanmu. Yang penting menulis senyaman gayamu sendiri.",
    },
  ],
};
