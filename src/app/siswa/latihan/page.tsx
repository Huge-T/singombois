import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MarkDoneButton } from "./MarkDoneButton";

export default async function LatihanPage() {
  const session = await auth();
  const assignments = await prisma.exerciseAssignment.findMany({
    where: { studentId: session!.user.id },
    include: { module: true },
    orderBy: { assignedAt: "desc" },
  });

  return (
    <div>
      <p className="crumb">SISWA</p>
      <h2 className="h2">Latihan saya</h2>
      <p className="sub">
        Satu fokus per sesi, dipilih dari aspek tulisanmu yang paling perlu dilatih minggu itu.
      </p>

      {assignments.length === 0 && (
        <p style={{ fontSize: 14, color: "var(--ink-2)" }}>
          Belum ada latihan. Latihan akan muncul setelah kamu mengunggah lembar jawaban pertamamu.
        </p>
      )}

      {assignments.map((a) => (
        <div key={a.id} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h3 style={{ fontFamily: "var(--disp)", fontSize: 19 }}>{a.module.title}</h3>
            <span className={`pill ${a.completedAt ? "pill-ok" : "pill-mark"}`}>
              {a.completedAt ? "SELESAI" : `${a.module.durationMin} MENIT`}
            </span>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.7, margin: "8px 0 14px" }}>
            {a.module.description}
          </p>
          {!a.completedAt && <MarkDoneButton assignmentId={a.id} />}
        </div>
      ))}
    </div>
  );
}
