/**
 * Salin SELURUH data dari PostgreSQL (Neon) ke MySQL/MariaDB, lalu verifikasi
 * baris demi baris. Sumber hanya DIBACA; tidak pernah diubah.
 *
 *   PG_DATABASE_URL=postgresql://...   (sumber)
 *   DATABASE_URL=mysql://...           (tujuan, dibaca Prisma dari env/.env)
 *
 *   npx tsx scripts/migrate-pg-to-mysql.ts --dry-run       # hitung baris sumber & tujuan
 *   npx tsx scripts/migrate-pg-to-mysql.ts                 # salin (tujuan HARUS kosong)
 *   npx tsx scripts/migrate-pg-to-mysql.ts --wipe          # kosongkan tujuan dulu, lalu salin
 *   npx tsx scripts/migrate-pg-to-mysql.ts --verify-only   # hanya bandingkan
 *
 * Klien sumber dibuat dari scripts/legacy-pg/schema.prisma:
 *   npx prisma generate --schema=scripts/legacy-pg/schema.prisma
 */
import { Prisma, PrismaClient } from "@prisma/client";

// require (bukan import) supaya `next build` tidak gagal bila klien sumber belum
// pernah di-generate di mesin build.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient: PgClient } = require("../node_modules/.prisma/client-pg");

const BATCH = 300;
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const wipe = args.has("--wipe");
const verifyOnly = args.has("--verify-only");

const pgUrl = process.env.PG_DATABASE_URL ?? "";
const myUrl = process.env.DATABASE_URL ?? "";
if (!/^postgres(ql)?:\/\//.test(pgUrl)) throw new Error("PG_DATABASE_URL harus berupa URL postgresql://");
if (!/^mysql:\/\//.test(myUrl)) throw new Error("DATABASE_URL (tujuan) harus berupa URL mysql://");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const src: any = new PgClient({ datasources: { db: { url: pgUrl } } });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dst: any = new PrismaClient();

type DmmfField = { name: string; kind: string; type: string; isList: boolean; relationFromFields?: string[] };
const models = Prisma.dmmf.datamodel.models as unknown as { name: string; fields: DmmfField[] }[];

const lower = (s: string) => s[0].toLowerCase() + s.slice(1);
const scalarFields = (m: { fields: DmmfField[] }) => m.fields.filter((f) => f.kind === "scalar" || f.kind === "enum").map((f) => f.name);

/** Urutan sisip: model yang dirujuk lebih dulu (topological sort atas FK). */
function insertionOrder() {
  const deps = new Map<string, Set<string>>();
  for (const m of models) {
    const d = new Set<string>();
    for (const f of m.fields) if (f.kind === "object" && f.relationFromFields?.length && f.type !== m.name) d.add(f.type);
    deps.set(m.name, d);
  }
  const order: string[] = [];
  const done = new Set<string>();
  while (order.length < models.length) {
    const before = order.length;
    for (const m of models) {
      if (done.has(m.name)) continue;
      if ([...deps.get(m.name)!].every((x) => done.has(x))) {
        order.push(m.name);
        done.add(m.name);
      }
    }
    if (order.length === before) throw new Error("Siklus relasi tak terduga: " + models.filter((m) => !done.has(m.name)).map((m) => m.name).join(", "));
  }
  return order;
}

async function counts(client: { [k: string]: { count: () => Promise<number> } }, order: string[]) {
  const out: Record<string, number> = {};
  for (const name of order) out[name] = await client[lower(name)].count();
  return out;
}

function canonical(row: Record<string, unknown>, fields: string[]) {
  const o: Record<string, unknown> = {};
  for (const f of fields) {
    const v = row[f];
    o[f] = v instanceof Date ? v.toISOString() : v;
  }
  return JSON.stringify(o);
}

async function main() {
  const order = insertionOrder();
  console.log(`Model: ${order.length}. Urutan sisip: ${order.join(" > ")}\n`);

  const srcCounts = await counts(src, order);
  let dstCounts = await counts(dst, order);
  const srcTotal = Object.values(srcCounts).reduce((a, b) => a + b, 0);
  const dstTotal = Object.values(dstCounts).reduce((a, b) => a + b, 0);
  console.log(`Baris sumber: ${srcTotal}, baris tujuan: ${dstTotal}`);
  if (dryRun) {
    for (const n of order) console.log(`  ${n.padEnd(24)} sumber=${String(srcCounts[n]).padStart(6)} tujuan=${String(dstCounts[n]).padStart(6)}`);
    return;
  }

  if (!verifyOnly) {
    if (dstTotal > 0 && !wipe) throw new Error("Tujuan tidak kosong. Pakai --wipe untuk mengosongkannya dulu.");
    if (wipe && dstTotal > 0) {
      console.log("Mengosongkan tujuan (urutan terbalik)...");
      await dst.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS=0");
      for (const n of [...order].reverse()) await dst[lower(n)].deleteMany();
      await dst.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS=1");
    }
    console.log("Menyalin...");
    for (const n of order) {
      const fields = scalarFields(models.find((m) => m.name === n)!);
      const rows: Record<string, unknown>[] = await src[lower(n)].findMany();
      for (let i = 0; i < rows.length; i += BATCH) {
        const data = rows.slice(i, i + BATCH).map((r) => Object.fromEntries(fields.map((f) => [f, r[f]])));
        await dst[lower(n)].createMany({ data });
      }
      console.log(`  ${n.padEnd(24)} ${rows.length} baris`);
    }
  }

  console.log("\nVerifikasi baris demi baris...");
  dstCounts = await counts(dst, order);
  let bad = 0;
  for (const n of order) {
    const fields = scalarFields(models.find((m) => m.name === n)!);
    const a: Record<string, unknown>[] = await src[lower(n)].findMany({ orderBy: { id: "asc" } });
    const b: Record<string, unknown>[] = await dst[lower(n)].findMany({ orderBy: { id: "asc" } });
    const mapB = new Map(b.map((r) => [r.id as string, canonical(r, fields)]));
    const problems: string[] = [];
    if (a.length !== b.length) problems.push(`jumlah beda: sumber ${a.length}, tujuan ${b.length}`);
    for (const r of a) {
      const want = canonical(r, fields);
      const got = mapB.get(r.id as string);
      if (got === undefined) problems.push(`hilang: ${r.id}`);
      else if (got !== want) {
        const wa = JSON.parse(want);
        const gb = JSON.parse(got);
        const diff = fields.filter((f) => JSON.stringify(wa[f]) !== JSON.stringify(gb[f])).join(",");
        problems.push(`beda ${r.id} di kolom: ${diff}`);
      }
      if (problems.length >= 5) break;
    }
    const status = problems.length ? "BEDA" : "ok";
    if (problems.length) bad++;
    console.log(`  ${n.padEnd(24)} sumber=${String(a.length).padStart(6)} tujuan=${String(b.length).padStart(6)}  ${status}`);
    for (const p of problems) console.log(`      - ${p}`);
  }
  console.log(bad === 0 ? `\nVERIFIKASI OK: ${order.length} tabel, ${srcTotal} baris identik.` : `\nVERIFIKASI GAGAL di ${bad} tabel.`);
  if (bad) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await src.$disconnect();
    await dst.$disconnect();
  });
