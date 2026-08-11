import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const student = await prisma.student.findUnique({
    where: { id: session.user.id },
    include: {
      class: true,
      consents: true,
      submissions: {
        include: {
          session: { select: { label: true } },
          scores: { include: { teacherReviews: true } },
          artifacts: { include: { featureSet: true } },
        },
      },
      exerciseAssignments: { include: { module: true } },
    },
  });

  if (!student) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const { pinHash: _pinHash, ...rest } = student;
  void _pinHash;

  return new NextResponse(JSON.stringify(rest, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="data-singombois-${student.nisn}.json"`,
    },
  });
}
