// Menghasilkan daftar berkas di public/ sebagai JSON yang ikut ter-bundle.
// Di serverless (Vercel) fungsi tidak bisa cek keberadaan berkas public/
// dengan existsSync — kontrak aset ASSETS.md (placeholder rapi saat berkas
// belum diunggah) tetap jalan lewat manifest ini. Dijalankan otomatis lewat
// predev/prebuild; folder uploads/ dikecualikan karena berisi berkas runtime.
import { readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "public");
const files = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) {
      if (name === "uploads") continue;
      walk(abs);
    } else if (name !== ".DS_Store") {
      files.push(path.relative(root, abs).split(path.sep).join("/"));
    }
  }
}

walk(root);
files.sort();
writeFileSync(
  path.join(process.cwd(), "src", "content", "asset-manifest.json"),
  JSON.stringify(files, null, 2) + "\n"
);
console.log(`asset-manifest: ${files.length} berkas publik terdata`);
