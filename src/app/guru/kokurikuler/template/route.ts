import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildKokurikulerCsvTemplate } from "@/lib/kokurikulerCsv";

export async function GET() {
  const session = await auth();
  const role = session?.user.role;
  if (!session?.user || (role !== "TEACHER" && role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  return new NextResponse(buildKokurikulerCsvTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="template-soal-kokurikuler.csv"',
    },
  });
}
