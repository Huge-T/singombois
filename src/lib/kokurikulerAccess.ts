import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/lib/auth";
import { deleteUploadedFile } from "@/lib/storage";
import { withRetry } from "@/lib/dbRetry";

/**
 * Kontrol akses terpusat untuk fitur kokurikuler — dipakai oleh ketiga area
 * viewer (guru, bk, koordinator) supaya otorisasi tidak diduplikasi. Berhak
 * melihat hasil kuis: guru pembuat, wali kelas siswa yang bersangkutan, Guru
 * BK, atau Koordinator/Admin. Draft KokurikulerReading tetap hanya dibaca
 * penulisnya sendiri lewat pengecekan status di halaman (lihat AttemptDetail).
 */
export interface KokurikulerViewer {
  id: string;
  role: AppRole;
  schoolId: string;
}

const PRIVILEGED_ROLES: AppRole[] = ["GURU_BK", "COORDINATOR", "ADMIN", "SUPER_ADMIN"];

export async function loadQuizForViewer(quizId: string, viewer: KokurikulerViewer) {
  const quiz = await prisma.kokurikulerQuiz.findUnique({
    where: { id: quizId },
    include: {
      class: { include: { homeroomTeacher: true, school: true } },
      createdBy: true,
      questions: { orderBy: { order: "asc" } },
      attempts: {
        include: {
          student: true,
          answers: { include: { artifact: { include: { featureSet: true } } } },
          reading: { include: { reader: true } },
          essayGradedBy: true,
        },
        orderBy: { createdAt: "asc" },
      },
      targetedStudents: true,
    },
  });
  if (!quiz) return null;
  if (quiz.class.schoolId !== viewer.schoolId) return null;

  const isCreator = quiz.createdById === viewer.id;
  const isHomeroom = quiz.class.homeroomTeacherId === viewer.id;
  const isPrivileged = PRIVILEGED_ROLES.includes(viewer.role);
  if (!isCreator && !isHomeroom && !isPrivileged) return null;

  return quiz;
}

export type KokurikulerQuizForViewer = NonNullable<Awaited<ReturnType<typeof loadQuizForViewer>>>;

export function canGradeEssay(viewer: KokurikulerViewer, quiz: { createdById: string }): boolean {
  return viewer.id === quiz.createdById || viewer.role === "ADMIN" || viewer.role === "SUPER_ADMIN";
}

export function canWriteKokurikulerReading(viewer: KokurikulerViewer, quiz: { createdById: string }): boolean {
  return (
    viewer.id === quiz.createdById ||
    viewer.role === "GURU_BK" ||
    viewer.role === "ADMIN" ||
    viewer.role === "SUPER_ADMIN"
  );
}

/** Bersihkan jawaban+foto+pembacaan attempt lalu buka lagi untuk dikerjakan
 *  ulang siswa — dipakai saat kesimpulan otomatis (lihat kokurikulerConclusion.ts)
 *  menandai terlalu banyak dimensi lemah untuk dinilai apa adanya. Attempt-nya
 *  sendiri tidak dihapus (beda dari deleteKokurikulerQuiz), cuma direset ke
 *  kondisi "belum dikerjakan". Otorisasi dicek di pemanggil (actions.ts
 *  masing-masing role), bukan di sini. */
export async function resetKokurikulerAttemptCore(attemptId: string) {
  const artifacts = await prisma.kokurikulerArtifact.findMany({
    where: { answer: { attemptId } },
    select: { id: true, originalPath: true },
  });
  for (const artifact of artifacts) {
    await deleteUploadedFile(artifact.originalPath);
  }

  await withRetry(() =>
    prisma.$transaction([
      prisma.kokurikulerFeatureSet.deleteMany({ where: { artifactId: { in: artifacts.map((a) => a.id) } } }),
      prisma.kokurikulerArtifact.deleteMany({ where: { answer: { attemptId } } }),
      prisma.kokurikulerAnswer.deleteMany({ where: { attemptId } }),
      prisma.kokurikulerReading.deleteMany({ where: { attemptId } }),
      prisma.kokurikulerAttempt.update({
        where: { id: attemptId },
        data: {
          submittedAt: null,
          autoCorrect: null,
          autoTotal: null,
          essayScore: null,
          essayGradedById: null,
          essayGradedAt: null,
          finalScore: null,
        },
      }),
    ])
  );
}

export interface KokurikulerIndicationItem {
  dimension: string;
  title: string;
  detail: string;
}

/** Upsert KokurikulerReading + catat AuditLog — mirror persis saveReading (bk/[submissionId]/actions.ts). */
export async function upsertKokurikulerReading(
  attemptId: string,
  readerId: string,
  data: { indications: KokurikulerIndicationItem[]; narrative: string; notes: string },
  publish: boolean
) {
  const indications = data.indications.filter((i) => i.dimension.trim() || i.title.trim() || i.detail.trim());

  const reading = await prisma.kokurikulerReading.upsert({
    where: { attemptId },
    update: {
      readerId,
      indicationsJson: JSON.stringify(indications),
      narrative: data.narrative,
      notes: data.notes || null,
      status: publish ? "PUBLISHED" : "DRAFT",
      publishedAt: publish ? new Date() : undefined,
    },
    create: {
      attemptId,
      readerId,
      indicationsJson: JSON.stringify(indications),
      narrative: data.narrative,
      notes: data.notes || null,
      status: publish ? "PUBLISHED" : "DRAFT",
      publishedAt: publish ? new Date() : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: readerId,
      actorType: "staff",
      action: publish ? "PUBLISH_KOKURIKULER_READING" : "DRAFT_KOKURIKULER_READING",
      entity: "KokurikulerReading",
      entityId: reading.id,
    },
  });

  return reading;
}
