import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadQuizForViewer } from "@/lib/kokurikulerAccess";
import { PrintButton } from "@/app/guru/sesi/[id]/cetak/PrintButton";

const RULE_COLOR = "#CBD8E6";
const MARGIN_COLOR = "#E8B4A8";
const LINE_COUNT = 20; // muat di A4 (±236mm dari 273mm) walau teks soal beberapa baris
const MARGIN_LEFT_MM = 22;

/**
 * Lembar jawaban uraian kuis kokurikuler: satu halaman A4 per siswa per soal
 * uraian, memakai pola lembar kerja literasi (4 marker sudut, garis berjarak
 * tetap, garis margin) supaya foto jawabannya bisa dikalibrasi sama seperti
 * lembar literasi. Hanya untuk kuis yang punya template lembar kerja.
 */
export default async function CetakLembarUraianPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const session = await auth();
  const quiz = await loadQuizForViewer(quizId, session!.user);
  if (!quiz) notFound();

  const essayQuestions = quiz.questions.filter((q) => q.type === "URAIAN");
  const template = quiz.worksheetTemplateId
    ? await prisma.worksheetTemplate.findUnique({ where: { id: quiz.worksheetTemplateId } })
    : null;

  if (!template || essayQuestions.length === 0) {
    return (
      <div>
        <p className="crumb">GURU · {quiz.label}</p>
        <h2 className="h2">Cetak lembar uraian</h2>
        <p className="sub">
          {!template
            ? "Kuis ini tidak memakai template lembar kerja, jadi jawaban uraian diketik siswa langsung di aplikasi dan tidak ada lembar untuk dicetak."
            : "Kuis ini belum punya soal uraian."}
        </p>
      </div>
    );
  }

  // Kuis tertarget (hanya siswa tertentu): cetak untuk siswa terpilih saja.
  const targetIds = quiz.targetedStudents.map((t) => t.studentId);
  const students = await prisma.student.findMany({
    where: {
      classId: quiz.classId,
      archivedAt: null,
      ...(targetIds.length > 0 ? { id: { in: targetIds } } : {}),
    },
    orderBy: { name: "asc" },
  });

  const sheets = students.flatMap((student) => essayQuestions.map((question) => ({ student, question })));
  const qrDataUrls = await Promise.all(
    sheets.map(({ student, question }) =>
      QRCode.toDataURL(JSON.stringify({ quizId: quiz.id, studentId: student.id, questionId: question.id }), {
        margin: 0,
        width: 200,
      })
    )
  );

  const lineHeightMm = template.lineHeightMm;

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none; }
          .print-page { page-break-after: always; }
          @page { size: A4; margin: 12mm; }
        }
        .print-page, .print-page * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-page {
          width: 186mm;
          min-height: 273mm;
          margin: 0 auto 20px;
          position: relative;
          background: white;
          color: #16232F;
          font-family: system-ui, sans-serif;
          padding: 4mm;
        }
        .corner { position: absolute; width: 6mm; height: 6mm; background: #16232F; }
        .lines { position: relative; margin-top: 3mm; margin-left: ${MARGIN_LEFT_MM}mm; }
        .rule-row { height: ${lineHeightMm}mm; border-bottom: 0.4mm solid ${RULE_COLOR}; }
        .margin-line { position: absolute; top: 0; bottom: 0; left: ${MARGIN_LEFT_MM - 2}mm; width: 0.5mm; background: ${MARGIN_COLOR}; }
      `}</style>

      <div className="no-print sheet" style={{ padding: "24px" }}>
        <h2 className="h2">Cetak lembar uraian · {quiz.label}</h2>
        <p className="sub">
          {sheets.length} lembar akan dicetak: {students.length} siswa di {quiz.class.name} × {essayQuestions.length}{" "}
          soal uraian, satu lembar per soal.
        </p>
        <PrintButton />
        <p className="hint">Matikan opsi &quot;Fit to page&quot; di dialog cetak agar 1mm di kertas = 1mm sungguhan.</p>
      </div>

      {sheets.map(({ student, question }, i) => (
        <div className="print-page" key={`${student.id}-${question.id}`}>
          <div className="corner" style={{ top: 0, left: 0 }} />
          <div className="corner" style={{ top: 0, right: 0 }} />
          <div className="corner" style={{ bottom: 0, left: 0 }} />
          <div className="corner" style={{ bottom: 0, right: 0 }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 10, letterSpacing: "0.06em", color: "#7C8590" }}>
                SINGO MBOIS · KOKURIKULER · {quiz.class.name.toUpperCase()}
              </p>
              <h3 style={{ fontSize: 16, margin: "4px 0" }}>
                {quiz.label}
                {quiz.tema ? ` · Tema ${quiz.tema}` : ""}
              </h3>
              <p style={{ fontSize: 12 }}>
                Nama: <b>{student.name}</b> &nbsp;·&nbsp; NISN: {student.nisn}
              </p>
              <p style={{ fontSize: 10, color: "#7C8590" }}>Template: {template.name}</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrls[i]} alt="QR identifikasi lembar" width={64} height={64} />
          </div>

          <div style={{ marginTop: "5mm", padding: "2.5mm 3mm", border: "0.3mm solid #16232F" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#7C8590" }}>SOAL URAIAN NO. {question.order}</p>
            <p style={{ fontSize: 12, marginTop: "1mm", whiteSpace: "pre-wrap" }}>{question.text}</p>
          </div>

          <p style={{ fontSize: 10, margin: "3mm 0 0", color: "#3d4854" }}>
            Tulis jawabanmu dengan tulisan tanganmu sendiri di garis di bawah ini, lalu foto lembar ini utuh dan
            unggah di aplikasi.
          </p>
          <div className="lines">
            <div className="margin-line" />
            {Array.from({ length: LINE_COUNT }).map((_, li) => (
              <div className="rule-row" key={li} />
            ))}
          </div>

          <p style={{ fontSize: 8, color: "#7C8590", marginTop: "4mm" }}>
            SKALA TERKALIBRASI DARI JARAK GARIS {lineHeightMm}mm · 4 MARKER SUDUT · RUBRIK KERAPIAN-V1.0
          </p>
        </div>
      ))}
    </div>
  );
}
