import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateQuizForm } from "./CreateQuizForm";

export default async function BuatKokurikulerPage() {
  const session = await auth();
  const schoolId = session!.user.schoolId;

  const [classes, students, templates] = await Promise.all([
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.student.findMany({ where: { schoolId, archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.worksheetTemplate.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <p className="crumb">GURU</p>
      <h2 className="h2">Buat kuis kokurikuler</h2>
      <p className="sub">
        Setelah kuis dibuat, unduh template CSV dan unggah soal + kunci jawaban sekaligus. Kalau ada soal
        uraian, siswa menjawabnya lewat foto tulisan tangan di lembar kerja (dianalisis grafologi juga).
      </p>

      <CreateQuizForm
        classes={classes.map((c) => ({ id: c.id, label: `${c.name} (kelas ${c.grade})` }))}
        students={students.map((s) => ({ id: s.id, name: s.name, classId: s.classId }))}
        templates={templates.map((t) => ({ id: t.id, label: t.name }))}
      />
    </div>
  );
}
