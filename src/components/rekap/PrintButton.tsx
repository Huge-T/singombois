"use client";

/** Tombol cetak. Dengan `fokus`, hanya kartu (.card) tempat tombol ini berada
 *  yang dicetak (bagian lain halaman disembunyikan lewat kelas sementara). */
export function PrintButton({ fokus = false, label = "Cetak / simpan PDF" }: { fokus?: boolean; label?: string }) {
  function cetak(e: React.MouseEvent<HTMLButtonElement>) {
    if (!fokus) {
      window.print();
      return;
    }
    const kartu = e.currentTarget.closest(".card");
    kartu?.classList.add("cetak-area");
    document.body.classList.add("cetak-mode");
    const bersihkan = () => {
      kartu?.classList.remove("cetak-area");
      document.body.classList.remove("cetak-mode");
      window.removeEventListener("afterprint", bersihkan);
    };
    window.addEventListener("afterprint", bersihkan);
    window.print();
  }
  return (
    <button type="button" className="btn btn-ghost btn-sm rekap-cetak" onClick={cetak}>
      {label}
    </button>
  );
}
