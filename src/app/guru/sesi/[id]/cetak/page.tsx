import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PrintButton } from "./PrintButton";

const RULE_COLOR = "#CBD8E6";
const MARGIN_COLOR = "#E8B4A8";

export default async function CetakLembarKerjaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const literacySession = await prisma.session.findUnique({
    where: { id },
    include: { class: true, worksheetTemplate: true, storyPrompt: true, targetedStudents: true },
  });
  if (!literacySession) notFound();

  // Sesi tertarget (screening individual): cetak hanya untuk siswa terpilih.
  const targetIds = literacySession.targetedStudents.map((t) => t.studentId);
  const students = await prisma.student.findMany({
    where: {
      classId: literacySession.classId,
      archivedAt: null,
      ...(targetIds.length > 0 ? { id: { in: targetIds } } : {}),
    },
    orderBy: { name: "asc" },
  });

  // Pre-create submissions so each printed sheet's QR encodes a real, stable
  // submission id — this is the v1 groundwork for QR auto-linking (UP-2);
  // the upload endpoint itself still relies on the logged-in student session
  // rather than decoding the QR, which is the honest scope boundary for now.
  const submissions = await Promise.all(
    students.map((s) =>
      prisma.submission.upsert({
        where: { sessionId_studentId: { sessionId: id, studentId: s.id } },
        update: {},
        create: { sessionId: id, studentId: s.id },
      })
    )
  );

  const qrDataUrls = await Promise.all(
    submissions.map((sub) => QRCode.toDataURL(JSON.stringify({ submissionId: sub.id }), { margin: 0, width: 200 }))
  );

  const lineHeightMm = literacySession.worksheetTemplate.lineHeightMm;
  const isGestalt = Boolean(literacySession.storyPrompt);
  const lineCount = isGestalt ? 10 : 22; // sesi Gestalt: dua bagian berlabel, garis dibagi dua
  const marginLeftMm = 22;

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none; }
          .print-page { page-break-after: always; }
          @page { size: A4; margin: 12mm; }
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
        .lines { position: relative; margin-top: 10mm; margin-left: ${marginLeftMm}mm; }
        .rule-row { height: ${lineHeightMm}mm; border-bottom: 0.3mm solid ${RULE_COLOR}; }
        .margin-line { position: absolute; top: 0; bottom: 0; left: ${marginLeftMm - 2}mm; width: 0.4mm; background: ${MARGIN_COLOR}; }
      `}</style>

      <div className="no-print sheet" style={{ padding: "24px" }}>
        <h2 className="h2">Cetak lembar kerja · {literacySession.label}</h2>
        <p className="sub">{students.length} lembar akan dicetak, satu per siswa di {literacySession.class.name}.</p>
        <PrintButton />
        <p className="hint">Matikan opsi &quot;Fit to page&quot; di dialog cetak agar 1mm di kertas = 1mm sungguhan.</p>
      </div>

      {students.map((student, i) => (
        <div className="print-page" key={student.id}>
          <div className="corner" style={{ top: 0, left: 0 }} />
          <div className="corner" style={{ top: 0, right: 0 }} />
          <div className="corner" style={{ bottom: 0, left: 0 }} />
          <div className="corner" style={{ bottom: 0, right: 0 }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 10, letterSpacing: "0.06em", color: "#7C8590" }}>
                SINGO MBOIS · {literacySession.class.name.toUpperCase()}
                {isGestalt ? ` · LEVEL ${literacySession.level}` : ""}
              </p>
              <h3 style={{ fontSize: 16, margin: "4px 0" }}>{literacySession.label}</h3>
              <p style={{ fontSize: 12 }}>
                Nama: <b>{student.name}</b> &nbsp;·&nbsp; NISN: {student.nisn}
              </p>
              <p style={{ fontSize: 10, color: "#7C8590" }}>Template: {literacySession.worksheetTemplate.name}</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrls[i]} alt="QR identifikasi lembar" width={64} height={64} />
          </div>

          {isGestalt ? (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, marginTop: "6mm" }}>
                A. Jawaban soal (tulis tangan, beri nomor tiap jawaban)
              </p>
              <div className="lines" style={{ marginTop: "2mm" }}>
                <div className="margin-line" />
                {Array.from({ length: lineCount }).map((_, li) => (
                  <div className="rule-row" key={li} />
                ))}
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, marginTop: "6mm" }}>
                B. Lanjutan cerita dari gambar
              </p>
              <p style={{ fontSize: 10, fontStyle: "italic", margin: "1mm 0 0", color: "#3d4854" }}>
                {literacySession.storyPrompt!.starterText}
              </p>
              <div className="lines" style={{ marginTop: "2mm" }}>
                <div className="margin-line" />
                {Array.from({ length: lineCount }).map((_, li) => (
                  <div className="rule-row" key={li} />
                ))}
              </div>
            </>
          ) : (
            <div className="lines">
              <div className="margin-line" />
              {Array.from({ length: lineCount }).map((_, li) => (
                <div className="rule-row" key={li} />
              ))}
            </div>
          )}

          <p style={{ fontSize: 8, color: "#7C8590", marginTop: "4mm" }}>
            SKALA TERKALIBRASI DARI JARAK GARIS {lineHeightMm}mm · 4 MARKER SUDUT · RUBRIK KERAPIAN-V1.0
          </p>
        </div>
      ))}
    </div>
  );
}
