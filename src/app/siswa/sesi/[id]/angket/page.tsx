import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AngketForm } from "./AngketForm";

export default async function AngketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const literacySession = await prisma.session.findUnique({ where: { id } });
  if (!literacySession) redirect("/siswa");

  const submission = await prisma.submission.findUnique({
    where: { sessionId_studentId: { sessionId: id, studentId: session!.user.id } },
    include: { feedbacks: true },
  });
  if (!submission || !submission.submittedAt) redirect(`/siswa/sesi/${id}`);

  const existing = submission.feedbacks[0] ?? null;

  return (
    <div>
      <p className="crumb">ULASAN · {literacySession.label.toUpperCase()}</p>
      <h2 className="h2">Beri ulasan pengalamanmu</h2>
      <p className="sub">
        Kasih bintang & ceritakan pengalamanmu, sekitar dua menit. Ulasanmu membantu tim
        memperbaiki layanan, dan kalau kamu izinkan, bisa tampil di beranda situs.
      </p>

      <AngketForm
        sessionId={id}
        initial={
          existing
            ? {
                awareness: existing.awareness,
                clarityScore: existing.clarityScore,
                impression: existing.impression,
                suggestion: existing.suggestion ?? "",
                displayConsent: existing.displayConsent,
              }
            : null
        }
      />
    </div>
  );
}
