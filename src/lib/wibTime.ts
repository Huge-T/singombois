// Input <input type="datetime-local"> mengirim string tanpa info zona waktu
// (mis. "2026-09-25T14:00"), diisi sesuai jam yang TAMPIL di browser guru
// (WIB, UTC+7). new Date(string) polos menafsirkannya sesuai zona waktu
// SERVER (Vercel = UTC), bukan zona waktu guru — akibatnya jam buka/tutup
// sesi/kuis meleset 7 jam dari yang dimaksud. Selalu jangkarkan eksplisit
// ke WIB di sini, sekolah beroperasi di satu zona waktu tetap (tidak ada DST).
export function parseWibDateTimeLocal(value: string): Date {
  return new Date(`${value}:00+07:00`);
}

const WIB_OFFSET_MS = 7 * 3600 * 1000;

// Batas hari kalender (mis. untuk grafik "per hari") harus mengikuti tengah
// malam WIB, bukan tengah malam server (Vercel = UTC) — kalau tidak, jam
// 17:00-24:00 WIB ikut terhitung "kemarin" karena UTC-nya belum ganti hari.
// Sama akar masalahnya dengan bug jam sesi/kuis di atas.
export function wibMidnight(date: Date): Date {
  const wibShifted = new Date(date.getTime() + WIB_OFFSET_MS);
  const y = wibShifted.getUTCFullYear();
  const m = wibShifted.getUTCMonth();
  const d = wibShifted.getUTCDate();
  return new Date(Date.UTC(y, m, d) - WIB_OFFSET_MS);
}
