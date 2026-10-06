/**
 * Halaman ISR (beranda, Giat) mengambil data dari database saat `next build`.
 * Di hosting yang membangun aplikasi di mesin terpisah dari database (mis.
 * MariaDB hanya terjangkau dari runtime), query itu bisa gagal dan membatalkan
 * seluruh deploy. Saat build, pakai nilai kosong dan biarkan revalidate
 * pertama (5 menit) mengisi data asli. Di runtime error tetap dilempar.
 */
export async function buildSafe<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (e) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      console.warn("Database tak terjangkau saat build; halaman dibuat dengan data kosong:", e instanceof Error ? e.message : e);
      return fallback;
    }
    throw e;
  }
}
