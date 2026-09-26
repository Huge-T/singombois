"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setParentReviewApproved, deleteParentReview } from "./actions";

export function ParentReviewToggle({ reviewId, approved }: { reviewId: string; approved: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function toggle() {
    setError(null);
    startTransition(async () => {
      try {
        await setParentReviewApproved(reviewId, !approved);
        router.refresh();
      } catch {
        setError("Gagal menyimpan.");
      }
    });
  }

  function remove() {
    if (!window.confirm("Hapus ulasan ini secara permanen? Biasanya untuk ulasan spam/tidak relevan.")) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteParentReview(reviewId);
        router.refresh();
      } catch {
        setError("Gagal menghapus.");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <button type="button" className={`btn btn-sm ${approved ? "btn-ghost" : ""}`} disabled={pending} onClick={toggle}>
        {pending ? "..." : approved ? "Turunkan dari beranda" : "Tampilkan di beranda"}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={remove}>
        Hapus
      </button>
      {error && <span style={{ fontSize: 12, color: "var(--pena-merah)" }}>{error}</span>}
    </span>
  );
}
