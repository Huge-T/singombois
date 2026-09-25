// Input <input type="datetime-local"> mengirim string tanpa info zona waktu
// (mis. "2026-09-25T14:00"), diisi sesuai jam yang TAMPIL di browser guru
// (WIB, UTC+7). new Date(string) polos menafsirkannya sesuai zona waktu
// SERVER (Vercel = UTC), bukan zona waktu guru — akibatnya jam buka/tutup
// sesi/kuis meleset 7 jam dari yang dimaksud. Selalu jangkarkan eksplisit
// ke WIB di sini, sekolah beroperasi di satu zona waktu tetap (tidak ada DST).
export function parseWibDateTimeLocal(value: string): Date {
  return new Date(`${value}:00+07:00`);
}
