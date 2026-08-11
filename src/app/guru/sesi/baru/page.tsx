import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateSessionForm } from "./CreateSessionForm";

export default async function BuatSesiPage() {
  const session = await auth();
  const schoolId = session!.user.schoolId;

  const [classes, texts, audios, storyPrompts, templates, students] = await Promise.all([
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.readingText.findMany({ where: { schoolId }, orderBy: { title: "asc" } }),
    prisma.audioMaterial.findMany({ where: { schoolId, qcPassed: true }, orderBy: { title: "asc" } }),
    prisma.storyPrompt.findMany({ where: { schoolId }, orderBy: { level: "asc" } }),
    prisma.worksheetTemplate.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.student.findMany({ where: { schoolId, archivedAt: null }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <p className="crumb">GURU</p>
      <h2 className="h2">Buat sesi baru</h2>
      <p className="sub">
        Pilih level tes Gestalt (Low untuk screening awal) atau sesi literasi umum, lalu bahan dari
        bank materi yang sudah disiapkan koordinator.
      </p>

      <CreateSessionForm
        classes={classes.map((c) => ({ id: c.id, label: `${c.name} (kelas ${c.grade})` }))}
        texts={texts.map((t) => ({ id: t.id, label: t.title, level: t.level }))}
        audios={audios.map((a) => ({ id: a.id, label: a.title, level: a.level }))}
        storyPrompts={storyPrompts.map((s) => ({ id: s.id, label: s.title, level: s.level }))}
        templates={templates.map((t) => ({ id: t.id, label: t.name }))}
        students={students.map((s) => ({ id: s.id, name: s.name, classId: s.classId }))}
      />
    </div>
  );
}
