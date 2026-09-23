import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RawFeatures } from "@/lib/analysis";
import { GESTALT_VERSION, TEKANAN_INFO, interpretGestalt } from "@/lib/gestalt";
import type { StrengthItem } from "@/app/bk/[submissionId]/actions";
import { ConclusionForm } from "./ConclusionForm";

const LEVEL_ORDER = ["LOW", "MIDDLE", "HIGH"] as const;

export default async function KesimpulanPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const session = await auth();

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: true, finalConclusion: true },
  });
  if (!student || student.schoolId !== session!.user.schoolId) notFound();

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      actorType: "staff",
      action: "VIEW_FINAL_CONCLUSION_RECAP",
      entity: "Student",
      entityId: studentId,
    },
  });

  // Rekap per level: submission Gestalt terbaru per level + fitur + reading BK.
  const gestaltSubmissions = await prisma.submission.findMany({
    where: { studentId, session: { storyPromptId: { not: null } }, submittedAt: { not: null } },
    include: {
      session: true,
      artifacts: { orderBy: { createdAt: "desc" }, take: 1, include: { featureSet: true } },
      characterReading: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  const perLevel = LEVEL_ORDER.map((level) => {
    const sub = gestaltSubmissions.find((s) => s.session.level === level);
    const artifact = sub?.artifacts[0];
    const gestalt =
      artifact?.kind === "TULISAN" && artifact.featureSet
        ? interpretGestalt(JSON.parse(artifact.featureSet.featuresJson) as RawFeatures)
        : null;
    const reading = sub?.characterReading;
    const strengths: StrengthItem[] = reading ? JSON.parse(reading.strengthsJson) : [];
    return { level, sub, gestalt, reading, strengths };
  });

  const validatedCount = perLevel.filter((l) => l.reading?.status === "PUBLISHED").length;
  const canPublish = validatedCount === 3;

  return (
    <div>
      <p className="crumb">
        GURU BK · KESIMPULAN AKHIR
        {student.finalConclusion && (
          <span
            className={`pill ${student.finalConclusion.status === "PUBLISHED" ? "pill-ok" : "pill-singo"}`}
            style={{ marginLeft: 10 }}
          >
            {student.finalConclusion.status === "PUBLISHED" ? "SUDAH TERBIT" : "DRAF"}
          </span>
        )}
      </p>
      <h2 className="h2">{student.name}</h2>
      <p className="sub">
        {student.class.name} · {validatedCount} dari 3 level tervalidasi. Rekap di bawah disusun
        otomatis dari ketiga level; kesimpulan akhirnya kamu yang menulis.
      </p>

      <div className="bk-rev">
        <div>
          {perLevel.map(({ level, sub, gestalt, reading, strengths }) => (
            <div className="card" key={level} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 8 }}>
                <b style={{ fontSize: 14 }}>Level {level}</b>
                {reading?.status === "PUBLISHED" ? (
                  <span className="pill pill-ok">TERVALIDASI</span>
                ) : sub ? (
                  <span className="pill pill-singo">MENUNGGU VALIDASI</span>
                ) : (
                  <span className="pill pill-graphite">BELUM DIKERJAKAN</span>
                )}
              </div>
              {gestalt && (
                <ul style={{ listStyle: "none", display: "grid", gap: 4, marginBottom: 8 }}>
                  {gestalt.map((g) => (
                    <li key={g.variable} style={{ fontSize: 12.5, color: "var(--tinta-lembut)" }}>
                      {g.measured
                        ? `${g.variableLabel}: ${g.category} (${
                            g.variable === "kemiringan"
                              ? `${g.rawValue > 0 ? "+" : ""}${g.rawValue.toFixed(0)}°`
                              : `${g.rawValue.toFixed(1)} ${g.unit}`
                          }) · ${g.title}`
                        : `${g.variableLabel}: tidak terukur`}
                    </li>
                  ))}
                </ul>
              )}
              {strengths.length > 0 && (
                <p style={{ fontSize: 12.5, color: "var(--tinta-lembut)" }}>
                  Pembacaan BK: {strengths.map((s) => s.title).join("; ")}
                </p>
              )}
            </div>
          ))}
          <p className="hint">
            Rekap mesin memakai {GESTALT_VERSION}. {TEKANAN_INFO}
          </p>
        </div>

        <ConclusionForm
          studentId={studentId}
          initialBody={student.finalConclusion?.body ?? ""}
          status={student.finalConclusion?.status ?? null}
          canPublish={canPublish}
          initialUpdatedAt={student.finalConclusion?.updatedAt.toISOString() ?? null}
        />
      </div>
    </div>
  );
}
