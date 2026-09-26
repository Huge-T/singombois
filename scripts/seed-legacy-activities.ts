import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Migrasi 6 kartu giat statis lama (content/assets.ts giatCards() + content/giat.ts
// GIAT.activities) ke tabel Activity setelah halaman /giat & beranda pindah ke
// data dinamis. Tidak ada tanggal asli yang tercatat untuk kegiatan-kegiatan ini,
// jadi didefaultkan ke tahun berjalan (2026) — koordinator bisa menambah kegiatan
// bertahun lama lewat /koordinator/kegiatan bila datanya diketahui.
const LEGACY_ACTIVITIES = [
  { title: "Sosialisasi SINGO MBOIS kepada siswa", category: "sosialisasi", year: 2026 },
  { title: "Tes awal kegiatan SINGO MBOIS", category: "tes awal", year: 2026 },
  { title: "Pendampingan tes awal SINGO MBOIS", category: "tes awal", year: 2026 },
  { title: "Kegiatan menyimak literasi", category: "literasi", year: 2026 },
  { title: "Kegiatan literasi kelas VII-C", category: "literasi", year: 2026 },
  { title: "Kegiatan literasi kelas IX-C", category: "literasi", year: 2026 },
];

async function main() {
  const school = await prisma.school.findFirst();
  if (!school) throw new Error("Tidak ada School di database — seed dibatalkan.");

  const existingCount = await prisma.activity.count({ where: { schoolId: school.id } });
  if (existingCount > 0) {
    console.log(`Sudah ada ${existingCount} Activity untuk sekolah ini — seed dilewati (idempoten).`);
    return;
  }

  for (const a of LEGACY_ACTIVITIES) {
    await prisma.activity.create({ data: { schoolId: school.id, ...a } });
  }
  console.log(`Selesai: ${LEGACY_ACTIVITIES.length} kegiatan lama dimasukkan untuk sekolah "${school.name}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
