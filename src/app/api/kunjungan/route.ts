import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VISITOR_COOKIE = "sm_vid";
const ONE_YEAR_S = 365 * 24 * 60 * 60;

// Path publik yang boleh dihitung — daftar tertutup supaya endpoint ini tidak
// bisa dipakai menggelembungkan angka dengan path karangan.
const COUNTABLE_PATHS = new Set([
  "/",
  "/metode",
  "/program",
  "/penelitian",
  "/tim",
  "/giat",
  "/untuk-sekolah-lain",
  "/masuk",
]);

export async function POST(req: NextRequest) {
  let path = "/";
  try {
    const body = await req.json();
    if (typeof body?.path === "string") path = body.path;
  } catch {
    // body kosong/bukan JSON: hitung sebagai beranda
  }
  if (!COUNTABLE_PATHS.has(path)) {
    return NextResponse.json({ counted: false });
  }

  let visitorId = req.cookies.get(VISITOR_COOKIE)?.value;
  const isNewVisitor = !visitorId || visitorId.length > 64;
  if (isNewVisitor) visitorId = randomUUID();

  const day = new Date().toISOString().slice(0, 10);
  let counted = true;
  try {
    await prisma.pageVisit.create({ data: { visitorId: visitorId!, path, day } });
  } catch {
    counted = false; // unique [visitorId, path, day]: sudah terhitung hari ini
  }

  const res = NextResponse.json({ counted });
  if (isNewVisitor) {
    res.cookies.set(VISITOR_COOKIE, visitorId!, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: ONE_YEAR_S,
      path: "/",
    });
  }
  return res;
}
