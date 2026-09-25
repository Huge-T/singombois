import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assetUrl } from "@/content/assets";
import { SessionRunner } from "./SessionRunner";

export default async function SesiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const student = await prisma.student.findUnique({
    where: { id: session!.user.id },
    include: { class: true },
  });
  if (!student) redirect("/masuk");

  const literacySession = await prisma.session.findUnique({
    where: { id },
    include: {
      readingText: true,
      audioMaterial: true,
      worksheetTemplate: true,
      storyPrompt: true,
      targetedStudents: true,
    },
  });
  if (!literacySession || literacySession.classId !== student.classId) redirect("/siswa");
  // Sesi tertarget: siswa di luar daftar tidak boleh membuka (ditegakkan server).
  if (
    literacySession.targetedStudents.length > 0 &&
    !literacySession.targetedStudents.some((t) => t.studentId === student.id)
  ) {
    redirect("/siswa");
  }
  const now = new Date();
  if (now < literacySession.opensAt || now > literacySession.closesAt) {
    redirect("/siswa");
  }

  let submission = await prisma.submission.findUnique({
    where: { sessionId_studentId: { sessionId: id, studentId: student.id } },
  });
  if (!submission) {
    submission = await prisma.submission.create({
      data: { sessionId: id, studentId: student.id },
    });
  }
  if (submission.submittedAt) redirect(`/siswa/sesi/${id}/hasil`);

  const readingText = literacySession.readingText;
  const audioMaterial = literacySession.audioMaterial;
  const storyPrompt = literacySession.storyPrompt;

  return (
    <SessionRunner
      submissionId={submission.id}
      sessionLabel={literacySession.label}
      level={storyPrompt ? literacySession.level : null}
      consentGranted={student.consentStatus === "GRANTED"}
      reading={
        readingText
          ? {
              title: readingText.title,
              body: readingText.body,
              quiz: readingText.quizJson ? JSON.parse(readingText.quizJson) : [],
              openQuestions: JSON.parse(readingText.openQuestionsJson ?? "[]"),
            }
          : null
      }
      listening={
        audioMaterial
          ? {
              title: audioMaterial.title,
              fileUrl: audioMaterial.fileUrl,
              quiz: audioMaterial.quizJson ? JSON.parse(audioMaterial.quizJson) : [],
              maxPlays: 2,
              openQuestions: JSON.parse(audioMaterial.openQuestionsJson ?? "[]"),
              questionsAudioUrl: audioMaterial.questionsAudioUrl,
            }
          : null
      }
      story={
        storyPrompt
          ? {
              title: storyPrompt.title,
              starterText: storyPrompt.starterText,
              imageUrl: assetUrl(storyPrompt.imageSlug),
            }
          : null
      }
      worksheetName={literacySession.worksheetTemplate.name}
      studentName={student.name}
      studentClass={student.class.name}
    />
  );
}
