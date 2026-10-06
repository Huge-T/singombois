import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextRequest } from "next/server";
import { resolveUploadPath } from "@/lib/storage";

export const runtime = "nodejs";

// Hanya tipe media; ekstensi lain disajikan sebagai unduhan biasa supaya
// berkas unggahan tidak pernah dieksekusi browser sebagai halaman.
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".webm": "audio/webm",
};

const HEADERS = {
  "Cache-Control": "public, max-age=31536000, immutable",
  "Accept-Ranges": "bytes",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; sandbox",
};

function safeDecode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** "bytes=start-end" → [start, end] inklusif, atau null bila tidak valid. */
function parseRange(header: string, size: number): [number, number] | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;
  let start: number;
  let end: number;
  if (m[1] === "") {
    const suffix = Number(m[2]);
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  return start <= end && start < size ? [start, end] : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const decoded = segments.map(safeDecode);
  if (decoded.some((s) => s === null || s === "" || s === "." || s === ".." || /[\\/]/.test(s))) {
    return new Response("Not found", { status: 404 });
  }
  const abs = resolveUploadPath(decoded.join("/"));
  if (!abs) return new Response("Not found", { status: 404 });

  let size: number;
  try {
    const info = await stat(/*turbopackIgnore: true*/ abs);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    size = info.size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const ext = path.extname(abs).toLowerCase();
  const type = CONTENT_TYPES[ext];
  const headers: Record<string, string> = {
    ...HEADERS,
    "Content-Type": type ?? "application/octet-stream",
  };
  if (!type) headers["Content-Disposition"] = "attachment";

  const rangeHeader = req.headers.get("range");
  if (rangeHeader) {
    const range = parseRange(rangeHeader, size);
    if (!range) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const [start, end] = range;
    const stream = Readable.toWeb(createReadStream(/*turbopackIgnore: true*/ abs, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }

  const stream = Readable.toWeb(createReadStream(/*turbopackIgnore: true*/ abs)) as ReadableStream;
  return new Response(stream, { status: 200, headers: { ...headers, "Content-Length": String(size) } });
}
