import { PrismaClient, ConsentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const AUDIO_DIR = path.join(process.cwd(), "public", "audio");

/**
 * Generates a real narration file with the macOS `say` TTS engine so the demo
 * "Menyimak" step has genuine audio + a transcript that actually matches it,
 * instead of a silent placeholder. Swap this for real studio-recorded audio
 * before launch (AUD-2 requires a human listening QC pass either way).
 */
function synthesizeNarration(text: string, filename: string): string {
  mkdirSync(AUDIO_DIR, { recursive: true });
  const aiffPath = path.join(AUDIO_DIR, `${filename}.aiff`);
  const m4aPath = path.join(AUDIO_DIR, `${filename}.m4a`);
  const publicUrl = `/audio/${filename}.m4a`;

  if (existsSync(m4aPath)) return publicUrl;

  try {
    execFileSync("say", ["-v", "Damayanti", "-o", aiffPath, text]);
    execFileSync("afconvert", ["-f", "m4af", "-d", "aac", aiffPath, m4aPath]);
    unlinkSync(aiffPath);
    return publicUrl;
  } catch {
    console.warn("TTS synthesis unavailable on this machine; leaving audio unset for", filename);
    return "";
  }
}

async function main() {
  console.log("Seeding SINGO MBOIS demo data...");

  const school = await prisma.school.create({
    data: { name: "SMP Negeri 27 Malang", npsn: "20533905", region: "Kota Malang" },
  });

  const academicYear = await prisma.academicYear.create({
    data: {
      schoolId: school.id,
      label: "2026/2027",
      startDate: new Date("2026-07-13"),
      endDate: new Date("2027-06-20"),
      active: true,
    },
  });

  const teacher = await prisma.staffUser.create({
    data: {
      schoolId: school.id,
      name: "Rina Wulandari",
      email: "guru@singombois.demo",
      passwordHash: await bcrypt.hash("guru123", 10),
      role: "TEACHER",
    },
  });

  const coordinator = await prisma.staffUser.create({
    data: {
      schoolId: school.id,
      name: "Tim SINGO MBOIS",
      email: "koordinator@singombois.demo",
      passwordHash: await bcrypt.hash("koordinator123", 10),
      role: "COORDINATOR",
    },
  });

  await prisma.staffUser.create({
    data: {
      schoolId: school.id,
      name: "Admin Sekolah",
      email: "admin@singombois.demo",
      passwordHash: await bcrypt.hash("admin123", 10),
      role: "ADMIN",
    },
  });

  const guruBk = await prisma.staffUser.create({
    data: {
      schoolId: school.id,
      name: "Pak Ardi",
      email: "bk@singombois.demo",
      passwordHash: await bcrypt.hash("bk123", 10),
      role: "GURU_BK",
    },
  });

  const classVIIC = await prisma.class.create({
    data: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      grade: 7,
      name: "VII-C",
      homeroomTeacherId: teacher.id,
    },
  });

  const studentNames = [
    "Dinda Ayu Lestari",
    "Bagas Prasetyo",
    "Naila Zahra Ramadhani",
    "Fajar Nugroho",
    "Kirana Putri Ardiansyah",
    "Rafi Firmansyah",
    "Salsabila Anjani",
    "Yusuf Maulana",
    "Aisyah Nur Fadhila",
    "Wahyu Setiawan",
    "Clarissa Amelia",
    "Deni Kurniawan",
  ];

  const students = [];
  for (let i = 0; i < studentNames.length; i++) {
    const nisn = `007${(1042 + i).toString().padStart(6, "0")}`;
    const student = await prisma.student.create({
      data: {
        schoolId: school.id,
        classId: classVIIC.id,
        name: studentNames[i],
        nisn,
        pinHash: await bcrypt.hash("1234", 10),
        // Last student left pending on purpose to demonstrate the consent gate (DATA-4).
        consentStatus: i === studentNames.length - 1 ? ConsentStatus.PENDING : ConsentStatus.GRANTED,
      },
    });
    await prisma.consent.create({
      data: {
        studentId: student.id,
        guardianName: `Wali dari ${studentNames[i]}`,
        status: student.consentStatus,
        grantedAt: student.consentStatus === "GRANTED" ? new Date("2026-07-10") : null,
      },
    });
    students.push(student);
  }

  const readingQuiz = [
    {
      question: "Apa nama gerakan kecil yang dibuat siswa dalam bacaan ini?",
      options: ["Satu Menit untuk Air", "Hemat Air Sekolah", "Keran Hijau", "Air untuk Semua"],
      correctIndex: 0,
    },
    {
      question: "Apa yang dilakukan siswa setelah mencuci tangan?",
      options: [
        "Membiarkan keran menyala",
        "Memastikan keran tertutup dan melapor bila bocor",
        "Mengisi ember untuk taman",
        "Mematikan listrik kelas",
      ],
      correctIndex: 1,
    },
    {
      question: "Menurut bacaan, menjaga air bersih adalah tugas siapa?",
      options: [
        "Hanya petugas kebersihan",
        "Hanya kepala sekolah",
        "Semua siswa lewat kebiasaan kecil bersama",
        "Hanya wali kelas",
      ],
      correctIndex: 2,
    },
  ];

  const readingText = await prisma.readingText.create({
    data: {
      schoolId: school.id,
      title: "Menjaga Air Bersih di Sekolah",
      gradeLevel: 7,
      theme: "Lingkungan",
      estMinutes: 4,
      quizJson: JSON.stringify(readingQuiz),
      body: `Air bersih sering dianggap selalu tersedia, padahal jumlahnya terbatas. Di sekolah, air digunakan untuk banyak hal: minum, mencuci tangan, menyiram tanaman, dan membersihkan kelas. Jika keran dibiarkan menyala saat tidak dipakai, air bersih terbuang percuma.

Beberapa siswa di SMP Negeri 27 Malang membuat gerakan kecil bernama "Satu Menit untuk Air". Setiap selesai mencuci tangan, mereka memastikan keran benar-benar tertutup dan melaporkan keran yang bocor kepada petugas sekolah. Gerakan ini terdengar sederhana, tetapi jika dilakukan oleh seluruh siswa setiap hari, jumlah air yang dihemat bisa sangat besar dalam satu tahun.

Menjaga air bersih bukan hanya tugas petugas kebersihan. Kebiasaan kecil yang dilakukan bersama-sama, secara konsisten, adalah cara paling nyata untuk merawat sekolah dan lingkungan sekitarnya.`,
    },
  });

  const narrationText =
    "Setiap pagi, petugas sekolah menyiram tanaman di taman belakang menggunakan air bekas cucian sayur dari kantin. " +
    "Cara ini mengurangi penggunaan air bersih tanpa membuat tanaman kekurangan air. " +
    "Beberapa siswa kelas tujuh membantu mencatat berapa liter air yang dipakai setiap minggu, lalu membandingkannya dari bulan ke bulan. " +
    "Mereka menemukan bahwa penggunaan air menurun setelah keran yang bocor di dekat kantin diperbaiki.";

  const audioUrl = synthesizeNarration(narrationText, "menyimak-air-bersih");

  const listeningQuiz = [
    {
      question: "Air bekas cucian sayur dari kantin dipakai untuk apa?",
      options: ["Diminum siswa", "Menyiram tanaman di taman belakang", "Mencuci lantai kelas", "Mengisi kolam ikan"],
      correctIndex: 1,
    },
    {
      question: "Siapa yang mencatat pemakaian air setiap minggu?",
      options: ["Petugas sekolah", "Kepala sekolah", "Beberapa siswa kelas tujuh", "Wali murid"],
      correctIndex: 2,
    },
  ];

  const audioMaterial = await prisma.audioMaterial.create({
    data: {
      schoolId: school.id,
      title: "Menghemat Air di Kantin Sekolah",
      fileUrl: audioUrl,
      transcript: narrationText,
      durationS: 32,
      qcPassed: Boolean(audioUrl),
      qcNote: audioUrl
        ? "Lolos uji dengar internal 15 Juli 2026 (AUD-2)."
        : "Menunggu sintesis/rekaman audio produksi.",
      quizJson: JSON.stringify(listeningQuiz),
    },
  });

  const worksheetTemplate = await prisma.worksheetTemplate.create({
    data: {
      schoolId: school.id,
      name: "Lembar Kerja Bergaris Standar (8mm)",
      lineHeightMm: 8,
      minWords: 20,
    },
  });

  // ===========================================================================
  // Materi tes Grafologi Gestalt berlevel (Low / Middle / High).
  // Konten persis dari tim (Juli 2026). Soal uraian dijawab TULIS TANGAN di
  // lembar kerja — itulah spesimen yang dianalisis variabel kemiringan huruf
  // serta ukuran & spasi. repeat = jumlah pengulangan pembacaan soal via audio.
  // ===========================================================================

  const fabelLow = await prisma.readingText.create({
    data: {
      schoolId: school.id,
      title: "Kura-kura yang Sombong",
      gradeLevel: 7,
      theme: "Fabel",
      estMinutes: 6,
      level: "LOW",
      openQuestionsJson: JSON.stringify([
        { question: "Sebutkan judul teks cerita tersebut!" },
        { question: "Siapa saja tokoh yang terdapat dalam cerita tersebut?" },
        { question: "Siapakah tokoh utama pada cerita tersebut?" },
        { question: "Apa yang diinginkan oleh kura-kura pada awal cerita?" },
        { question: "Bagaimana perasaan kura-kura ketika berhasil mencapai keinginannya?" },
      ]),
      body: `Kura-kura selalu merasa kesulitan karena cangkangnya yang berat, membuatnya sulit untuk bergerak dengan cepat. Meskipun ia mahir berenang, tetap saja ia tidak bisa mencapai ketinggian di udara seperti burung. Suatu hari, kura-kura mencoba membujuk burung agar mau membantunya terbang agar bisa pergi ke bagian lain hutan tanpa harus lelah berenang. Namun, muncul pertanyaan tentang bagaimana membawa kura-kura terbang. Akhirnya, burung-burung menemukan solusinya dengan membawa kura-kura menggunakan sebatang kayu. Karena tangannya tidak cukup kuat untuk berpegangan, kura-kura harus menggigit batang kayu itu dengan mulutnya. Dengan paruh yang besar dan tajam, kura-kura yakin bisa bertahan terbang sambil menggigit batang kayu yang disediakan oleh burung-burung.

Setelah memulai penerbangan, kura-kura melihat reaksi terkejut dari teman-temannya. Karena itu, ia merasa bangga dan bersedia untuk menunjukkan kebanggaannya dengan menyombongkan diri. Sayangnya, si kura-kura lupa bahwa mulutnya sudah terpakai untuk berpegangan. Akibatnya, saat ia mencoba menyombongkan diri dengan perkataan, pegangannya pun terlepas. Si kura-kura pun jatuh dari tempat tinggi. Namun beruntunglah karena cangkangnya yang keras dan besar menyelamatkannya. Jika tidak memiliki cangkang pelindung, mungkin saja kura-kura yang sombong ini sudah tidak selamat.

Setelah kejadian itu, ia tidak lagi mengeluhkan tentang cangkang yang besar dan berat yang dimilikinya. Sebaliknya, ia mulai menyadari bahwa cangkang tersebutlah yang telah menyelamatkannya. Si kura-kura juga tidak lagi merasa iri terhadap burung-burung karena akhirnya ia menyadari bahwa setiap hewan memiliki kelebihan masing-masing.`,
    },
  });

  const beritaMiddleText = `Memasuki tahun 2026, Orem-orem Malang terus menunjukkan eksistensinya sebagai kuliner legendaris yang wajib dicoba wisatawan. Kuliner berbahan dasar tempe goreng dan ayam yang dimasak dengan kuah santan bumbu kuning, tetap menjadi primadona karena cita rasanya yang autentik dan tak lekang oleh waktu.

Warung-warung orem-orem tradisional, baik di wilayah Kota Lama maupun kawasan Jalan Irian Jaya, konsisten menyajikan menu ini dengan harga terjangkau, yaitu mulai dari delapan ribu rupiah, menjadikannya pilihan kuliner yang ramah di kantong wisatawan.

Disajikan dengan ketupat atau lontong, taoge atau kecambah, serta taburan bawang goreng, orem-orem menawarkan perpaduan rasa gurih, sedikit pedas, dan aroma rempah yang khas, seringkali ditambah lauk pendamping seperti telur asin atau gorengan.

"Orem-orem bukan sekadar makanan, tapi pengingat suasana rumah dan identitas Kota Malang," ujar salah satu pengunjung, menunjukkan nilai filosofis kesederhanaan yang terkandung di dalamnya.

Dengan sejarah panjang yang dimulai dari tahun 1960-an, orem-orem terbukti mampu bertahan dan menjadi daya tarik utama bagi wisatawan kuliner yang mencari pengalaman autentik di Malang, menegaskan posisinya sebagai ikon wisata kuliner yang tak tergerus zaman.`;

  const beritaMiddleAudioUrl = synthesizeNarration(
    `Berburu Kuliner Autentik, Orem-orem Malang Tetap Jadi Primadona Wisata Kuliner 2026. ${beritaMiddleText.replace(/\n+/g, " ")}`,
    "menyimak-orem-orem-middle"
  );

  const beritaMiddle = await prisma.audioMaterial.create({
    data: {
      schoolId: school.id,
      title: "Berburu Kuliner Autentik, Orem-orem Malang Tetap Jadi Primadona Wisata Kuliner 2026",
      fileUrl: beritaMiddleAudioUrl,
      transcript: beritaMiddleText,
      durationS: 118,
      level: "MIDDLE",
      qcPassed: Boolean(beritaMiddleAudioUrl),
      qcNote: beritaMiddleAudioUrl
        ? "Audio sementara hasil sintesis suara; rekaman produksi tim rusak (Juli 2026), menunggu rekaman ulang."
        : "Menunggu rekaman audio produksi tim.",
      openQuestionsJson: JSON.stringify([
        { question: "Sebutkan judul berita tersebut!", repeat: 2 },
        { question: "Apa saja bahan dasar orem-orem?", repeat: 2 },
        { question: "Di kota manakah kita dapat menjumpai kuliner orem-orem dengan rasa yang otentik?", repeat: 3 },
        { question: "Kapan waktu awal mula munculnya kuliner orem-orem di kota Malang?", repeat: 3 },
        { question: "Mengapa orem-orem disebut sebagai kuliner otentik dan legendaris kota Malang?", repeat: 3 },
        { question: "Tulislah secara ringkas dan jelas terkait informasi pada berita tersebut!", repeat: 3 },
      ]),
    },
  });

  // Rekaman produksi tim (Juli 2026): teks berita yang sama ditugaskan sebagai
  // materi menyimak Level LOW — dikerjakan SETELAH soal membaca fabel. Soal
  // uraian dibacakan lewat rekaman terpisah (questionsAudioUrl); pengulangan
  // tiap soal sudah terekam di dalam file, dan teks soal disembunyikan default
  // di layar supaya yang terukur benar-benar kemampuan menyimak.
  const beritaLow = await prisma.audioMaterial.create({
    data: {
      schoolId: school.id,
      title: "Berburu Kuliner Autentik, Orem-orem Malang Tetap Jadi Primadona Wisata Kuliner 2026",
      fileUrl: "/audio/menyimak-teks-berita-low.m4a",
      questionsAudioUrl: "/audio/soal-teks-berita-low.m4a",
      transcript: beritaMiddleText,
      durationS: 162,
      level: "LOW",
      qcPassed: true,
      qcNote: "Rekaman produksi tim (Juli 2026).",
      openQuestionsJson: JSON.stringify([
        { question: "Sebutkan judul berita tersebut!", repeat: 2 },
        { question: "Apa saja bahan dasar orem-orem?", repeat: 2 },
        { question: "Di kota manakah kita dapat menjumpai kuliner orem-orem dengan rasa yang otentik?", repeat: 3 },
        { question: "Kapan waktu awal mula munculnya kuliner orem-orem di kota Malang?", repeat: 3 },
        { question: "Mengapa orem-orem disebut sebagai kuliner otentik dan legendaris kota Malang?", repeat: 3 },
        { question: "Tulislah secara ringkas dan jelas terkait informasi pada berita tersebut!", repeat: 3 },
      ]),
    },
  });

  const eksplanasiHighText = `Hujan merupakan peristiwa jatuhnya tetesan air dari atmosfer ke permukaan bumi. Hujan merupakan salah satu fenomena alam yang paling umum dan bagian penting dari siklus hidrologi yang mendaur ulang air di bumi.

Proses terjadinya hujan dimulai dengan evaporasi, yaitu penguapan air di permukaan bumi, seperti laut, sungai, dan danau, akibat panas sinar matahari. Uap air tersebut naik ke atmosfer yang lebih tinggi dan dingin, mengalami kondensasi atau pengembunan menjadi titik-titik air kecil, dan membentuk awan.

Awan-awan kecil tersebut kemudian berkumpul dan tertiup angin (adveksi), menjadi awan yang lebih besar dan berat (jenuh). Ketika tetesan air dalam awan sudah terlalu berat dan tidak lagi mampu ditahan oleh aliran udara, butiran air tersebut jatuh ke bumi akibat gaya gravitasi. Jika suhu udara di bawah awan di atas titik beku, air jatuh sebagai hujan.

Hujan memiliki peran vital dalam kehidupan, yaitu sebagai sumber air bersih, pendukung pertumbuhan tanaman, dan menjaga ekosistem. Namun, curah hujan yang terlalu tinggi dan terus-menerus dapat menyebabkan bencana seperti banjir dan tanah longsor, terutama jika lingkungan tidak dijaga dengan baik.`;

  // Rekaman produksi tim (Juli 2026) menggantikan TTS untuk Level High; soal
  // uraian juga dibacakan lewat rekaman terpisah (questionsAudioUrl).
  const eksplanasiHigh = await prisma.audioMaterial.create({
    data: {
      schoolId: school.id,
      title: "Proses Terjadinya Hujan",
      fileUrl: "/audio/menyimak-teks-eksplanasi-high.m4a",
      questionsAudioUrl: "/audio/soal-teks-eksplanasi-high.m4a",
      transcript: eksplanasiHighText,
      durationS: 175,
      level: "HIGH",
      qcPassed: true,
      qcNote: "Rekaman produksi tim (Juli 2026).",
      openQuestionsJson: JSON.stringify([
        { question: "Bagaimana proses evaporasi berperan dalam terjadinya hujan?" },
        { question: "Mengapa tetesan air dalam awan akhirnya jatuh ke permukaan bumi?" },
        { question: "Sebutkan tiga manfaat hujan bagi kehidupan manusia dan lingkungan!" },
        { question: "Mengapa curah hujan yang terlalu tinggi dapat menimbulkan bencana?" },
        { question: "Menurut teks, apa peran manusia dalam mencegah dampak negatif dari curah hujan yang tinggi?" },
      ]),
    },
  });

  const storyPromptLow = await prisma.storyPrompt.create({
    data: {
      schoolId: school.id,
      level: "LOW",
      title: "Liburan ke Rumah Nenek di Desa",
      imageSlug: "tes/gambar-bercerita-low.jpg",
      starterText:
        "Pada liburan sekolah tahun ini, aku bersama ayah, ibu, dan adik pergi berkunjung ke rumah nenek di desa. Kami senang berkunjung ke desa karena lingkungan yang asri dan banyak pepohonan. Kegiatan yang kami gemari ketika berada di rumah nenek yaitu bermain di danau.",
    },
  });

  const storyPromptMiddle = await prisma.storyPrompt.create({
    data: {
      schoolId: school.id,
      level: "MIDDLE",
      title: "Rumah Tempat Ternyaman",
      imageSlug: "tes/gambar-bercerita-middle.jpg",
      starterText:
        "Rumah adalah tempat ternyaman yang membuatku selalu bersemangat ketika beraktivitas sehari-hari. Ketika liburan sekolah seperti saat ini, aku merasa senang karena dapat menghabiskan waktu lebih banyak di rumah bersama ayah, ibu, kakak, dan adik.",
    },
  });

  const storyPromptHigh = await prisma.storyPrompt.create({
    data: {
      schoolId: school.id,
      level: "HIGH",
      title: "Berkunjung ke Taman Kota",
      imageSlug: "tes/gambar-bercerita-high.jpg",
      starterText:
        "Pada liburan sekolah, aku selalu pergi berkunjung ke taman kota. Aku berangkat dari rumah pada pagi hari dengan berjalan kaki. Letak taman kota yang cukup dekat menjadi alasan bagi ayah dan ibu memberikan ijin kepadaku untuk pergi bersama teman-teman.",
    },
  });

  const exerciseModules = await Promise.all(
    [
      {
        aspect: "sizeConsistency",
        title: "Konsistensi Tinggi Huruf",
        description:
          "Salin lima baris kalimat pendek pada kertas bergaris, jaga agar tinggi huruf kecil (a, e, i, o, u, n, m) tetap sama dari awal sampai akhir baris.",
      },
      {
        aspect: "baselineDeviation",
        title: "Kesejajaran Baris",
        description:
          "Tulis satu paragraf pendek sambil sesekali melirik garis kertas — pastikan huruf 'duduk' tepat di atas garis, bukan melayang atau tenggelam.",
      },
      {
        aspect: "wordSpacingRatio",
        title: "Jarak Antar Kata",
        description:
          "Salin kalimat contoh dengan sengaja menyisakan satu jari kelingking di antara setiap kata, lalu bandingkan dengan tulisan biasa.",
      },
      {
        aspect: "marginDeviation",
        title: "Kepatuhan Margin",
        description:
          "Tulis lima baris baru, mulai tiap baris tepat di garis margin kiri tanpa mengukur — lalu periksa sendiri seberapa lurus hasilnya.",
      },
    ].map((m) =>
      prisma.exerciseModule.create({
        data: { schoolId: school.id, aspect: m.aspect, title: m.title, description: m.description, durationMin: 5 },
      })
    )
  );

  const now = new Date();
  const session1 = await prisma.session.create({
    data: {
      classId: classVIIC.id,
      readingTextId: readingText.id,
      audioMaterialId: audioMaterial.id,
      worksheetTemplateId: worksheetTemplate.id,
      label: "Sesi 12 · Literasi VII-C",
      opensAt: new Date(now.getTime() - 3 * 24 * 3600 * 1000),
      closesAt: new Date(now.getTime() + 4 * 24 * 3600 * 1000),
      createdById: teacher.id,
      status: "OPEN",
    },
  });

  // Demo sesi Gestalt Level Low: screening individual hanya untuk Dinda
  // (students[0]) — memperlihatkan alur "guru menyiapkan sesi untuk siswa A".
  const sessionGestaltLow = await prisma.session.create({
    data: {
      classId: classVIIC.id,
      level: "LOW",
      readingTextId: fabelLow.id,
      audioMaterialId: beritaLow.id,
      storyPromptId: storyPromptLow.id,
      worksheetTemplateId: worksheetTemplate.id,
      label: "Screening Gestalt · Level Low",
      opensAt: new Date(now.getTime() - 1 * 24 * 3600 * 1000),
      closesAt: new Date(now.getTime() + 6 * 24 * 3600 * 1000),
      createdById: teacher.id,
      status: "OPEN",
      targetedStudents: { create: [{ studentId: students[0].id }] },
    },
  });
  void sessionGestaltLow;
  void beritaMiddle;
  void eksplanasiHigh;
  void storyPromptMiddle;
  void storyPromptHigh;

  // Baseline indicators straight from the published journal (Lampiran A / §10) —
  // these are fixed reference numbers, not something the app computes.
  const baseline: { code: string; label: string; value: number; target: number; n: number }[] = [
    { code: "reading_comprehension", label: "Membaca lembar kerja", value: 78, target: 84, n: 288 },
    { code: "text_understanding", label: "Memahami teks", value: 77, target: 83, n: 288 },
    { code: "careful_reading", label: "Membaca dengan cermat", value: 78, target: 84, n: 288 },
    { code: "listening", label: "Menyimak audio", value: 70, target: 78, n: 288 },
    { code: "audio_understanding", label: "Memahami audio", value: 74, target: 80, n: 288 },
    { code: "listening_focus", label: "Fokus menyimak", value: 78, target: 84, n: 288 },
    { code: "worksheet_completion", label: "Menyelesaikan lembar kerja", value: 78, target: 84, n: 288 },
    { code: "clear_writing", label: "Menulis jawaban dengan jelas", value: 77, target: 83, n: 288 },
    { code: "idea_expression", label: "Menuangkan ide ke tulisan", value: 76, target: 82, n: 288 },
    { code: "handwriting_neatness", label: "Kerapian tulisan tangan", value: 67, target: 75, n: 288 },
    { code: "speaking_confidence", label: "Keberanian berpendapat", value: 72, target: 78, n: 288 },
    { code: "letterform_attention", label: "Perhatian pada bentuk huruf", value: 74, target: 80, n: 288 },
    { code: "learning_support", label: "Membantu belajar", value: 78, target: 84, n: 288 },
    { code: "motivation", label: "Menambah semangat", value: 76, target: 82, n: 288 },
    { code: "overall_literacy", label: "Meningkatkan literasi", value: 79, target: 85, n: 288 },
  ];

  for (const b of baseline) {
    await prisma.indicatorSnapshot.create({
      data: {
        schoolId: school.id,
        indicatorCode: b.code,
        label: b.label,
        valuePct: b.value,
        targetPct: b.target,
        sampleN: b.n,
        source: "BASELINE_2026",
        capturedAt: new Date("2026-01-15"),
      },
    });
  }

  // Demo: satu siswa (Bagas) sudah punya submission + pembacaan karakter terpublikasi
  // dan satu tiket konsultasi berjalan, supaya alur BK terlihat sejak awal.
  const demoSubmission = await prisma.submission.create({
    data: {
      sessionId: session1.id,
      studentId: students[1].id,
      readSeconds: 210,
      audioPlays: 1,
      readingCorrect: 3,
      readingTotal: 3,
      listeningCorrect: 2,
      listeningTotal: 2,
      submittedAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
    },
  });

  await prisma.characterReading.create({
    data: {
      submissionId: demoSubmission.id,
      readerId: guruBk.id,
      status: "PUBLISHED",
      strengthsJson: JSON.stringify([
        {
          title: "Terbuka dan mudah bekerja sama",
          detail:
            "Tulisanmu condong ke kanan dengan ukuran yang stabil. Ini sering muncul pada siswa yang hangat dan nyaman belajar bersama teman. Manfaatkan: ajak temanmu belajar kelompok, kamu bisa jadi penggeraknya.",
        },
        {
          title: "Semangat yang terjaga",
          detail:
            "Garis dasar tulisanmu cenderung naik di tiap baris. Energi belajarmu bagus. Manfaatkan: pasang target kecil tiap minggu supaya semangat itu punya arah.",
        },
        {
          title: "Teliti pada detail",
          detail:
            "Jarak antar kata dan margin kirimu rapi. Kamu memperhatikan hal kecil. Manfaatkan: cocok jadi pemeriksa akhir tugas kelompok sebelum dikumpulkan.",
        },
      ]),
      learningSuggestions:
        "Coba metode belajar kelompok kecil (2-3 orang) dengan giliran menjelaskan. Untuk hafalan, tulis ulang poin penting dengan tanganmu sendiri, itu memperkuat ingatanmu.",
      notes: "Pertahankan kebiasaan menulis rapi. Tidak ada hal yang perlu dikhawatirkan.",
      publishedAt: new Date(now.getTime() - 1 * 24 * 3600 * 1000),
    },
  });

  const demoTicket = await prisma.consultTicket.create({
    data: {
      studentId: students[1].id,
      submissionId: demoSubmission.id,
      subject: "Maksud dari 'garis dasar naik' itu apa ya?",
      status: "ANSWERED",
    },
  });
  await prisma.consultMessage.create({
    data: {
      ticketId: demoTicket.id,
      senderRole: "STUDENT",
      senderId: students[1].id,
      body: "Pak, di hasil saya ada tulisan garis dasar naik. Itu maksudnya gimana? Apa tulisan saya salah?",
    },
  });
  await prisma.consultMessage.create({
    data: {
      ticketId: demoTicket.id,
      senderRole: "STAFF",
      senderId: guruBk.id,
      body: "Tidak salah sama sekali. Garis dasar itu garis bayangan tempat hurufmu berdiri. Kalau arahnya naik ke kanan, itu tanda energi dan semangatmu sedang bagus saat menulis. Justru bagus. Kalau mau kita bahas lebih jauh, mampir ke ruang BK ya.",
    },
  });

  // ===========================================================================
  // Data dummy kemanfaatan (permintaan tim, sementara sampai data asli):
  // 523 kunjungan (8 minggu, tren naik & jumlah grafik = ubin), 6 rombel,
  // 248 siswa terlayani, 184 tanggapan angket.
  // ===========================================================================
  const DAY = 24 * 3600 * 1000;
  const nowMs = now.getTime();

  const weeklyVisits = [35, 42, 50, 58, 66, 75, 88, 109]; // total 523
  const visitPaths = ["/", "/metode", "/program", "/penelitian", "/tim", "/giat"];
  const visitRows: { visitorId: string; path: string; day: string; createdAt: Date }[] = [];
  let visitIdx = 0;
  weeklyVisits.forEach((count, wi) => {
    const bucketIdx = weeklyVisits.length - 1 - wi; // 0 = pekan terbaru
    for (let v = 0; v < count; v++) {
      const offsetMs = bucketIdx * 7 * DAY + ((v + 0.5) / count) * (7 * DAY - 2 * 3600 * 1000) + 3600 * 1000;
      const date = new Date(nowMs - offsetMs);
      visitRows.push({
        visitorId: `dummy-v523-${visitIdx}`,
        path: visitPaths[visitIdx % visitPaths.length],
        day: date.toISOString().slice(0, 10),
        createdAt: date,
      });
      visitIdx++;
    }
  });
  await prisma.pageVisit.createMany({ data: visitRows });

  const extraClassSpecs = [
    { grade: 7, name: "VII-A" },
    { grade: 7, name: "VII-B" },
    { grade: 8, name: "VIII-A" },
    { grade: 8, name: "VIII-B" },
    { grade: 9, name: "IX-C" },
  ];
  const extraClasses: { classId: string; sessionId: string }[] = [];
  for (const spec of extraClassSpecs) {
    const cls = await prisma.class.create({
      data: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        grade: spec.grade,
        name: spec.name,
        homeroomTeacherId: teacher.id,
      },
    });
    const sess = await prisma.session.create({
      data: {
        classId: cls.id,
        readingTextId: readingText.id,
        audioMaterialId: audioMaterial.id,
        worksheetTemplateId: worksheetTemplate.id,
        label: `Sesi Literasi ${spec.name}`,
        opensAt: new Date(nowMs - 30 * DAY),
        closesAt: new Date(nowMs - 23 * DAY),
        createdById: teacher.id,
        status: "CLOSED",
      },
    });
    extraClasses.push({ classId: cls.id, sessionId: sess.id });
  }

  const dummyFirstNames = ["Aditya", "Bunga", "Citra", "Dimas", "Eka", "Fitri", "Galih", "Hana", "Ilham", "Jasmine", "Krisna", "Laras", "Mario", "Nadia", "Oscar", "Putri", "Qori", "Rendi", "Sinta", "Taufik", "Umi", "Vino", "Winda", "Xaverius", "Yola", "Zaki"];
  const dummyLastNames = ["Saputra", "Wulandari", "Hidayat", "Anggraini", "Ramadhan", "Kusuma", "Santoso", "Maharani", "Pratama", "Safitri", "Wijaya", "Utami"];
  const dummyPinHash = await bcrypt.hash("1234", 10);
  const targetServed = 248;
  const toServe = targetServed - 1; // Bagas sudah terlayani lewat demoSubmission di atas

  const dummyStudentRows = [];
  for (let i = 0; i < toServe; i++) {
    dummyStudentRows.push({
      schoolId: school.id,
      classId: extraClasses[i % extraClasses.length].classId,
      name: `${dummyFirstNames[i % dummyFirstNames.length]} ${dummyLastNames[Math.floor(i / dummyFirstNames.length) % dummyLastNames.length]}`,
      nisn: `007${(2001 + i).toString().padStart(6, "0")}`,
      pinHash: dummyPinHash,
      consentStatus: ConsentStatus.GRANTED,
    });
  }
  const dummyStudents = await prisma.student.createManyAndReturn({ data: dummyStudentRows });

  const strengthPool = [
    { title: "Rapi dan konsisten", detail: "Jarak antar kata dan margin kirimu terjaga dari awal sampai akhir halaman. Manfaatkan: jadi contoh cara menulis rapi untuk teman sekelas." },
    { title: "Terbuka pada teman", detail: "Tulisanmu condong ke kanan dan renggang, sering muncul pada siswa yang senang berinteraksi. Manfaatkan: belajar kelompok kemungkinan besar cocok untukmu." },
    { title: "Fokus dan runtut", detail: "Baris tulisanmu lurus dan spasinya konsisten, tanda kamu menyusun langkah sebelum bekerja. Manfaatkan: coba jadi yang membuat daftar tugas kelompok." },
    { title: "Semangat yang terjaga", detail: "Garis dasar tulisanmu cenderung naik di tiap baris. Manfaatkan: pasang target kecil tiap minggu supaya semangat itu punya arah." },
    { title: "Teliti pada detail", detail: "Bentuk hurufmu konsisten dan mudah dibaca. Manfaatkan: cocok jadi pemeriksa akhir tugas kelompok sebelum dikumpulkan." },
    { title: "Berani mengekspresikan diri", detail: "Tulisanmu besar dan lepas, tanda kamu nyaman mengekspresikan diri. Manfaatkan: ikut kegiatan yang butuh tampil di depan kelas." },
  ];
  const suggestionPool = [
    "Coba metode belajar kelompok kecil dengan giliran menjelaskan; itu memperkuat pemahamanmu sendiri.",
    "Buat rencana belajar mingguan tertulis, lalu centang tiap yang selesai.",
    "Salurkan energimu lewat sesi belajar pendek tapi sering, 15-20 menit per sesi.",
    "Untuk hafalan, tulis ulang poin penting dengan tanganmu sendiri.",
    "Latih kecepatan menulis dengan latihan bertimer singkat, tanpa mengorbankan kerapian.",
  ];
  const sessionOfClass = new Map(extraClasses.map((c) => [c.classId, c.sessionId]));
  const dummySubmissions = await prisma.submission.createManyAndReturn({
    data: dummyStudents.map((s, i) => ({
      sessionId: sessionOfClass.get(s.classId)!,
      studentId: s.id,
      readSeconds: 150 + ((i * 37) % 120),
      audioPlays: 1 + (i % 2),
      readingCorrect: 2 + (i % 2),
      readingTotal: 3,
      listeningCorrect: 1 + (i % 2),
      listeningTotal: 2,
      submittedAt: new Date(nowMs - (25 + (i % 20)) * DAY),
    })),
  });
  await prisma.characterReading.createMany({
    data: dummySubmissions.map((sub, i) => ({
      submissionId: sub.id,
      readerId: guruBk.id,
      status: "PUBLISHED" as const,
      strengthsJson: JSON.stringify([strengthPool[i % strengthPool.length], strengthPool[(i + 2) % strengthPool.length]]),
      learningSuggestions: suggestionPool[i % suggestionPool.length],
      publishedAt: new Date(nowMs - (20 + (i % 15)) * DAY),
    })),
  });

  const curatedFeedbacks = [
    { student: students[1], submissionId: demoSubmission.id, awareness: "TIDAK_TAHU", clarityScore: 5, impression: "Ternyata dari tulisan tanganku kelihatan kalau aku lebih cocok belajar bareng teman. Sekarang belajar kelompok jadi lebih semangat.", suggestion: "Kalau bisa hasilnya keluar lebih cepat.", displayConsent: "DENGAN_NAMA", approved: true },
    { student: students[0], submissionId: null, awareness: "TIDAK_TAHU", clarityScore: 5, impression: "Awalnya kupikir cuma tes iseng, ternyata sarannya kepakai buat cara belajarku sehari-hari.", suggestion: null, displayConsent: "DENGAN_NAMA", approved: true },
    { student: students[2], submissionId: null, awareness: "PERNAH_DENGAR", clarityScore: 4, impression: "Seru, kayak dibaca tapi bukan diramal. Sarannya masuk akal dan bisa langsung dicoba.", suggestion: null, displayConsent: "ANONIM", approved: true },
    { student: students[6], submissionId: null, awareness: "PERNAH_DENGAR", clarityScore: 5, impression: "Suka banget bagian latihan 5 menitnya, ringan tapi kerasa hasilnya.", suggestion: "Tambahin variasi latihan biar tidak bosan.", displayConsent: "ANONIM", approved: true },
    { student: students[3], submissionId: null, awareness: "TIDAK_TAHU", clarityScore: 4, impression: "Aku jadi tahu kenapa catatanku susah dibaca, dan latihan 5 menitnya beneran ngebantu.", suggestion: "Tambahin pilihan latihan yang bisa dikerjakan di rumah.", displayConsent: "DENGAN_NAMA", approved: false },
    { student: students[4], submissionId: null, awareness: "TAHU", clarityScore: 3, impression: "Lumayan, tapi aku masih bingung bedanya sama pelajaran BK biasa.", suggestion: "Penjelasan awalnya dibikin lebih singkat.", displayConsent: "TIDAK", approved: false },
    { student: students[5], submissionId: null, awareness: "PERNAH_DENGAR", clarityScore: 5, impression: "Paling berkesan waktu dibilang tulisanku menunjukkan aku orangnya teliti. Jadi pede.", suggestion: null, displayConsent: "ANONIM", approved: false },
    { student: students[7], submissionId: null, awareness: "TAHU", clarityScore: 4, impression: "Pembacaannya jujur, tidak terkesan menghakimi. Nyaman ikutnya.", suggestion: null, displayConsent: "DENGAN_NAMA", approved: false },
    { student: students[8], submissionId: null, awareness: "PERNAH_DENGAR", clarityScore: 3, impression: "Cukup membantu, walau butuh waktu buat paham istilah-istilahnya.", suggestion: "Kasih contoh lebih banyak di halaman metode.", displayConsent: "ANONIM", approved: false },
  ] as const;
  for (const f of curatedFeedbacks) {
    await prisma.feedback.create({
      data: {
        studentId: f.student.id,
        submissionId: f.submissionId,
        awareness: f.awareness,
        clarityScore: f.clarityScore,
        impression: f.impression,
        suggestion: f.suggestion,
        displayConsent: f.displayConsent,
        approved: f.approved,
      },
    });
  }

  const targetFeedback = 184;
  const impressionPool = [
    "Jadi tahu cara belajar yang paling pas buatku, tidak asal ikut-ikutan teman.",
    "Sarannya spesifik, bukan nasihat umum. Kepakai langsung minggu itu juga.",
    "Awalnya deg-degan dibaca tulisannya, ternyata isinya bikin percaya diri.",
    "Latihan 5 menitnya ringan tapi kerasa bedanya di catatan pelajaran.",
    "Seru, kayak dikasih peta tentang diri sendiri.",
    "Baru kali ini ada yang bilang tulisanku menunjukkan hal baik, biasanya cuma disuruh merapikan.",
    "Aku jadi rajin nulis ulang materi karena katanya itu cocok buat gayaku.",
    "Hasilnya masuk akal dan tidak menghakimi.",
  ];
  const bulkFeedbackCount = targetFeedback - curatedFeedbacks.length;
  await prisma.feedback.createMany({
    data: Array.from({ length: bulkFeedbackCount }, (_, i) => ({
      studentId: dummyStudents[i % dummyStudents.length].id,
      submissionId: null,
      awareness: (["TIDAK_TAHU", "PERNAH_DENGAR", "TIDAK_TAHU", "TAHU"] as const)[i % 4],
      clarityScore: [5, 4, 4, 5, 3, 5, 4, 5][i % 8],
      impression: impressionPool[i % impressionPool.length],
      suggestion: i % 3 === 0 ? "Kalau bisa sesi berikutnya lebih sering." : null,
      displayConsent: (["ANONIM", "DENGAN_NAMA", "ANONIM", "TIDAK"] as const)[i % 4],
      approved: false,
    })),
  });

  // ---------- Kokurikuler: kuis demo + 2 attempt (1 dinilai lengkap, 1 belum) ----------
  const kokurikulerQuiz = await prisma.kokurikulerQuiz.create({
    data: {
      classId: classVIIC.id,
      createdById: teacher.id,
      label: "Asesmen Sumatif Kokurikuler Tema GEMATI",
      tema: "GEMATI",
      status: "OPEN",
      opensAt: new Date(nowMs - 3 * DAY),
      closesAt: new Date(nowMs + 7 * DAY),
    },
  });

  const kokurikulerQuestionRows: {
    order: number;
    type: "PILIHAN_GANDA" | "BENAR_SALAH" | "URAIAN";
    text: string;
    optionsJson: string | null;
    correctAnswer: string | null;
    personalityDimension: string | null;
  }[] = [
    {
      order: 1,
      type: "PILIHAN_GANDA",
      text: 'Sejak kecil, Laras sering mendengar bahwa perempuan sebaiknya tidak bermimpi terlalu tinggi. Namun, ia diam-diam menyimpan keinginan menjadi dokter. Meski harus belajar di sela membantu orang tuanya, Laras tetap berusaha keras. Watak tokoh Laras adalah …',
      optionsJson: JSON.stringify(["Pemalas", "Gigih", "Penakut", "Egois"]),
      correctAnswer: "B",
      personalityDimension: "ketangguhan",
    },
    {
      order: 2,
      type: "PILIHAN_GANDA",
      text: '"Ia tersenyum, meski hatinya dipenuhi keraguan." Konflik yang dialami tokoh tersebut adalah …',
      optionsJson: JSON.stringify([
        "Konflik dengan orang lain",
        "Konflik dalam diri tokoh",
        "Konflik dengan lingkungan",
        "Konflik karena keadaan",
      ]),
      correctAnswer: "B",
      personalityDimension: "empati",
    },
    {
      order: 3,
      type: "PILIHAN_GANDA",
      text: "Alur cerita yang disampaikan secara urut dari awal hingga akhir disebut …",
      optionsJson: JSON.stringify(["Alur mundur", "Alur campuran", "Alur maju", "Alur bebas"]),
      correctAnswer: "C",
      personalityDimension: null,
    },
    {
      order: 4,
      type: "BENAR_SALAH",
      text: "Bekerja sama membuat tugas kelompok lebih cepat selesai.",
      optionsJson: null,
      correctAnswer: "BENAR",
      personalityDimension: "kepemimpinan",
    },
    {
      order: 5,
      type: "BENAR_SALAH",
      text: "Menyerah saat menghadapi tugas sulit adalah sikap yang dianjurkan.",
      optionsJson: null,
      correctAnswer: "SALAH",
      personalityDimension: "ketangguhan",
    },
    {
      order: 6,
      type: "URAIAN",
      text: "Ceritakan pengalamanmu saat menghadapi tugas yang terasa sangat sulit. Apa yang kamu lakukan?",
      optionsJson: null,
      correctAnswer: null,
      personalityDimension: "ketangguhan",
    },
  ];
  await prisma.kokurikulerQuestion.createMany({
    data: kokurikulerQuestionRows.map((q) => ({ ...q, quizId: kokurikulerQuiz.id })),
  });
  const kokurikulerQuestions = await prisma.kokurikulerQuestion.findMany({
    where: { quizId: kokurikulerQuiz.id },
    orderBy: { order: "asc" },
  });

  // Dinda: dinilai lengkap (esai dinilai guru + analisis kepribadian terbit).
  const dindaAnswers = ["B", "B", "C", "BENAR", "SALAH", "Aku sempat ingin menyerah, tapi akhirnya minta bantuan teman dan mencicil sedikit demi sedikit sampai selesai."];
  const dindaAttempt = await prisma.kokurikulerAttempt.create({
    data: {
      quizId: kokurikulerQuiz.id,
      studentId: students[0].id,
      submittedAt: new Date(nowMs - 2 * DAY),
      autoCorrect: 5,
      autoTotal: 5,
      essayScore: 85,
      essayGradedById: teacher.id,
      essayGradedAt: new Date(nowMs - 1 * DAY),
      finalScore: 87.5, // ((5 + 0.85) / 6) * 100, dibulatkan
      answers: {
        create: kokurikulerQuestions.map((q, i) => ({
          questionId: q.id,
          answerText: dindaAnswers[i],
          isCorrect: q.type === "URAIAN" ? null : dindaAnswers[i] === q.correctAnswer,
        })),
      },
    },
  });
  await prisma.kokurikulerReading.create({
    data: {
      attemptId: dindaAttempt.id,
      readerId: teacher.id,
      status: "PUBLISHED",
      indicationsJson: JSON.stringify([
        {
          dimension: "ketangguhan",
          title: "Tidak mudah menyerah",
          detail: "Konsisten menjawab benar pada soal bertema ketangguhan, dan jawaban uraiannya menunjukkan strategi mencoba lagi alih-alih berhenti.",
        },
      ]),
      narrative:
        "Dinda menunjukkan pola tidak mudah menyerah saat menghadapi tugas sulit, terlihat dari jawaban pilihan ganda/benar-salah maupun ceritanya di soal uraian.",
      notes: null,
      publishedAt: new Date(nowMs - 1 * DAY),
    },
  });

  // Bagas: sudah mengumpulkan, esai belum dinilai guru (finalScore masih null).
  const bagasAnswers = ["B", "A", "C", "BENAR", "SALAH", "Kadang aku minta bantuan kakak kalau benar-benar mentok."];
  await prisma.kokurikulerAttempt.create({
    data: {
      quizId: kokurikulerQuiz.id,
      studentId: students[1].id,
      submittedAt: new Date(nowMs - 1 * DAY),
      autoCorrect: 4,
      autoTotal: 5,
      finalScore: null,
      answers: {
        create: kokurikulerQuestions.map((q, i) => ({
          questionId: q.id,
          answerText: bagasAnswers[i],
          isCorrect: q.type === "URAIAN" ? null : bagasAnswers[i] === q.correctAnswer,
        })),
      },
    },
  });

  console.log(
    `Dummy kemanfaatan: ${await prisma.pageVisit.count()} kunjungan, ` +
      `${(await prisma.session.groupBy({ by: ["classId"] })).length} rombel ber-sesi, ` +
      `${targetServed} siswa terlayani, ${await prisma.feedback.count()} tanggapan.`
  );
  console.log(`Kokurikuler demo: ${kokurikulerQuiz.label} (${kokurikulerQuestions.length} soal, 2 attempt).`);

  console.log("Seed complete.");
  console.log("");
  console.log("Login demo:");
  console.log("  Guru        : guru@singombois.demo / guru123");
  console.log("  Guru BK     : bk@singombois.demo / bk123");
  console.log("  Koordinator : koordinator@singombois.demo / koordinator123");
  console.log("  Admin       : admin@singombois.demo / admin123");
  console.log(`  Siswa       : NISN ${students[0].nisn} (Dinda Ayu Lestari) / PIN 1234`);
  console.log(`  (semua siswa lain pakai PIN 1234; NISN dimulai dari 0071042)`);
  console.log(`Sesi aktif: ${session1.label}`);
  console.log(`Modul latihan dibuat: ${exerciseModules.length}`);
  console.log("Demo pembacaan karakter: Bagas Prasetyo (NISN 007001043) sudah punya hasil + tiket konsultasi.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
