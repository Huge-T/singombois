import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/roleHome";

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

// Kunci dedup fallback untuk request tanpa cookie (script tanpa cookie jar,
// browser dengan cookie diblokir) — hash IP, bukan UUID acak, supaya request
// berulang dari sumber yang sama tetap kena constraint unique harian alih-alih
// selalu insert baris baru tanpa batas.
function fallbackVisitorId(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

export async function POST(req: NextRequest) {
  let path = "/";
  try {
    const body = await req.json();
    if (typeof body?.path === "string") path = body.path;
  } catch {
    // body kosong/bukan JSON: hitung sebagai beranda
  }
  // Tujuan "Ke beranda saya" untuk menu atas (halaman publik di-cache, jadi
  // status login dibawa lewat respons ping ini, bukan dibaca saat render).
  const session = await auth();
  const home = session?.user ? ROLE_HOME[session.user.role] : null;

  if (!COUNTABLE_PATHS.has(path)) {
    return NextResponse.json({ counted: false, home });
  }

  const cookieVisitorId = req.cookies.get(VISITOR_COOKIE)?.value;
  const hasValidCookie = Boolean(cookieVisitorId && cookieVisitorId.length <= 64);
  const dedupeVisitorId = hasValidCookie ? cookieVisitorId! : fallbackVisitorId(req);

  const day = new Date().toISOString().slice(0, 10);
  let counted = true;
  try {
    await prisma.pageVisit.create({ data: { visitorId: dedupeVisitorId, path, day } });
  } catch {
    counted = false; // unique [visitorId, path, day]: sudah terhitung hari ini
  }

  const res = NextResponse.json({ counted, home });
  if (!hasValidCookie) {
    res.cookies.set(VISITOR_COOKIE, randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: ONE_YEAR_S,
      path: "/",
    });
  }
  return res;
}
