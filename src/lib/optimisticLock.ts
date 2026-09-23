/**
 * Dilempar saat penyimpanan gagal karena baris sudah diubah pihak lain sejak
 * form dimuat (dua Guru BK edit submission/kesimpulan yang sama bersamaan) —
 * mencegah "lost update" (yang menyimpan terakhir menimpa total tulisan
 * kolega tanpa peringatan).
 */
export class ConflictError extends Error {
  constructor(
    message = "Data ini sudah diubah orang lain sejak kamu membuka halaman ini. Muat ulang halaman untuk melihat versi terbaru sebelum menyimpan lagi."
  ) {
    super(message);
    this.name = "ConflictError";
  }
}
