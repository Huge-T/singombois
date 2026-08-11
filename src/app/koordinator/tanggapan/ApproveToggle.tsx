"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFeedbackApproved } from "./actions";

export function ApproveToggle({
  feedbackId,
  approved,
  consentAllows,
}: {
  feedbackId: string;
  approved: boolean;
  consentAllows: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!consentAllows) {
    return <span className="pill pill-graphite">SISWA TIDAK MENGIZINKAN</span>;
  }

  function toggle() {
    setError(null);
    startTransition(async () => {
      try {
        await setFeedbackApproved(feedbackId, !approved);
        router.refresh();
      } catch {
        setError("Gagal menyimpan.");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <button type="button" className={`btn btn-sm ${approved ? "btn-ghost" : ""}`} disabled={pending} onClick={toggle}>
        {pending ? "..." : approved ? "Turunkan dari beranda" : "Tampilkan di beranda"}
      </button>
      {error && <span style={{ fontSize: 12, color: "var(--pena-merah)" }}>{error}</span>}
    </span>
  );
}
