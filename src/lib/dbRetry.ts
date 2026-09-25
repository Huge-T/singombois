// Database gratis (Neon) menangguhkan compute-nya saat tidak dipakai, dan makin
// terasa saat banyak pengguna mengakses bersamaan (jam pelajaran) — permintaan
// pertama kadang gagal duluan sebelum compute "bangun". Coba ulang sekali
// sebelum benar-benar menyerah, supaya pengguna tidak perlu mengulang manual
// untuk kasus umum ini.
export async function withRetry<T>(fn: () => Promise<T>, attempts = 2, delayMs = 1200): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}
