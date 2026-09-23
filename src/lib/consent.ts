import { prisma } from "@/lib/prisma";
import { deleteUploadedFile } from "@/lib/storage";

/**
 * PRIV-2: mencabut persetujuan menghapus artefak unggahan siswa beserta hasil
 * turunannya (skor, review guru, fitur terukur) dan berkas fisiknya. Dipakai
 * baik saat siswa mencabut sendiri maupun saat koordinator mencabut atas nama
 * wali murid — keduanya harus punya efek yang sama, bukan cuma ubah status.
 */
export async function deleteStudentArtifacts(studentId: string): Promise<void> {
  const artifacts = await prisma.artifact.findMany({
    where: { submission: { studentId } },
  });

  for (const artifact of artifacts) {
    await deleteUploadedFile(artifact.originalPath);
  }

  await prisma.$transaction([
    prisma.teacherReview.deleteMany({ where: { score: { submission: { studentId } } } }),
    prisma.score.deleteMany({ where: { submission: { studentId } } }),
    prisma.featureSet.deleteMany({ where: { artifact: { submission: { studentId } } } }),
    prisma.artifact.deleteMany({ where: { submission: { studentId } } }),
  ]);
}
