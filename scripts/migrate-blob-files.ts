/**
 * Pindahkan berkas lama dari Vercel Blob ke UPLOAD_DIR, lalu ubah URL di
 * database dari https://...blob.vercel-storage.com/<path> menjadi /files/<path>.
 * Cukup butuh DATABASE_URL dan UPLOAD_DIR (URL Blob bersifat publik, tanpa token).
 *
 *   npx tsx scripts/migrate-blob-files.ts                    # hitung saja, tidak mengubah apa pun
 *   npx tsx scripts/migrate-blob-files.ts --download-only    # unduh berkas, DB tidak diubah
 *   npx tsx scripts/migrate-blob-files.ts --apply            # unduh + ubah URL di DB
 *   npx tsx scripts/migrate-blob-files.ts --rollback <backup.json>   # kembalikan URL lama
 *
 * Sebelum mengubah DB, URL lama disimpan ke migrate-blob-backup-<waktu>.json.
 * DB hanya diubah untuk baris yang berkasnya sudah terverifikasi ada di disk.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { FILES_URL_PREFIX, resolveUploadPath, uploadRoot } from "../src/lib/storage";

const prisma = new PrismaClient();
const BLOB_HOST = "blob.vercel-storage.com";
const CONCURRENCY = 4;

type Target = { model: "artifact" | "kokurikulerArtifact" | "activityPhoto" | "audioMaterial"; field: string };
const TARGETS: Target[] = [
  { model: "artifact", field: "originalPath" },
  { model: "kokurikulerArtifact", field: "originalPath" },
  { model: "activityPhoto", field: "url" },
  { model: "audioMaterial", field: "fileUrl" },
  { model: "audioMaterial", field: "questionsAudioUrl" },
];

interface Row {
  model: Target["model"];
  field: string;
  id: string;
  oldUrl: string;
  rel: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const delegate = (model: Target["model"]): any => (prisma as any)[model];

function relFromBlobUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith(BLOB_HOST)) return null;
    return decodeURIComponent(u.pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

async function collectRows(): Promise<Row[]> {
  const rows: Row[] = [];
  for (const t of TARGETS) {
    const found: { id: string; [k: string]: string }[] = await delegate(t.model).findMany({
      where: { [t.field]: { contains: BLOB_HOST } },
      select: { id: true, [t.field]: true },
    });
    for (const r of found) {
      const oldUrl = r[t.field];
      const rel = relFromBlobUrl(oldUrl);
      if (rel) rows.push({ model: t.model, field: t.field, id: r.id, oldUrl, rel });
    }
  }
  return rows;
}

async function downloadOne(url: string, rel: string): Promise<{ bytes: number; skipped: boolean }> {
  const abs = resolveUploadPath(rel);
  if (!abs) throw new Error(`Path tidak valid: ${rel}`);
  if (existsSync(abs) && (await stat(abs)).size > 0) return { bytes: 0, skipped: true };

  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const expected = Number(res.headers.get("content-length") ?? "");
      if (Number.isFinite(expected) && expected > 0 && buf.length !== expected) {
        throw new Error(`ukuran tidak cocok (${buf.length} dari ${expected})`);
      }
      if (buf.length === 0) throw new Error("berkas kosong");
      await mkdir(path.dirname(abs), { recursive: true });
      const tmp = `${abs}.part`;
      await writeFile(tmp, buf);
      await rename(tmp, abs);
      return { bytes: buf.length, skipped: false };
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastErr;
}

async function downloadAll(rows: Row[]) {
  const unique = new Map<string, string>();
  for (const r of rows) unique.set(r.rel, r.oldUrl);
  const queue = [...unique.entries()];
  let done = 0;
  let downloaded = 0;
  let skipped = 0;
  let bytes = 0;
  const failed: { rel: string; error: string }[] = [];

  async function worker() {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const [rel, url] = item;
      try {
        const r = await downloadOne(url, rel);
        if (r.skipped) skipped++;
        else {
          downloaded++;
          bytes += r.bytes;
        }
      } catch (e) {
        failed.push({ rel, error: e instanceof Error ? e.message : String(e) });
      }
      done++;
      if (done % 25 === 0 || done === unique.size) console.log(`  ${done}/${unique.size}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { unique: unique.size, downloaded, skipped, bytes, failed };
}

async function rollback(file: string) {
  const rows = JSON.parse(readFileSync(file, "utf-8")) as Row[];
  let n = 0;
  for (const r of rows) {
    await delegate(r.model).update({ where: { id: r.id }, data: { [r.field]: r.oldUrl } });
    n++;
  }
  console.log(`Rollback selesai: ${n} baris dikembalikan ke URL lama.`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--rollback") {
    if (!args[1]) throw new Error("Sebutkan berkas cadangan: --rollback <backup.json>");
    return rollback(args[1]);
  }
  const apply = args.includes("--apply");
  const downloadOnly = args.includes("--download-only");

  console.log(`UPLOAD_DIR: ${uploadRoot()}`);
  const rows = await collectRows();
  const perField: Record<string, number> = {};
  for (const r of rows) perField[`${r.model}.${r.field}`] = (perField[`${r.model}.${r.field}`] ?? 0) + 1;
  console.log(`Baris ber-URL Blob: ${rows.length}`, perField);
  console.log(`Berkas unik: ${new Set(rows.map((r) => r.rel)).size}`);

  if (!apply && !downloadOnly) {
    console.log("Mode hitung saja. Tambahkan --download-only atau --apply untuk menjalankan.");
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(process.cwd(), `migrate-blob-backup-${stamp}.json`);
  writeFileSync(backupFile, JSON.stringify(rows, null, 2));
  console.log(`Cadangan URL lama: ${backupFile}`);

  console.log("Mengunduh berkas...");
  const dl = await downloadAll(rows);
  console.log(`Unduh: ${dl.downloaded} baru (${(dl.bytes / 1048576).toFixed(1)} MB), ${dl.skipped} sudah ada, ${dl.failed.length} gagal`);
  if (dl.failed.length) {
    for (const f of dl.failed.slice(0, 20)) console.log(`  GAGAL ${f.rel}: ${f.error}`);
    if (apply) console.log("DB tidak diubah untuk baris yang berkasnya gagal diunduh.");
  }
  if (!apply) return;

  const failedRel = new Set(dl.failed.map((f) => f.rel));
  const ready = rows.filter((r) => {
    if (failedRel.has(r.rel)) return false;
    const abs = resolveUploadPath(r.rel);
    return Boolean(abs && existsSync(abs));
  });
  const byModel = new Map<Target["model"], Row[]>();
  for (const r of ready) byModel.set(r.model, [...(byModel.get(r.model) ?? []), r]);

  let updated = 0;
  for (const [model, list] of byModel) {
    await prisma.$transaction(
      list.map((r) => delegate(model).update({ where: { id: r.id }, data: { [r.field]: `${FILES_URL_PREFIX}${r.rel}` } }))
    );
    updated += list.length;
  }
  console.log(`DB diperbarui: ${updated} dari ${rows.length} baris.`);
  const left = await collectRows();
  console.log(`Sisa baris ber-URL Blob: ${left.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
