"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reprocessArtifactAsTulisan } from "./actions";

export function ReprocessButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (
      !window.confirm(
        "Foto ini akan diproses ulang sebagai tulisan tangan (bukan gambar) memakai berkas yang sudah tersimpan — siswa tidak perlu foto ulang. Lanjutkan?"
      )
    )
      return;
    setMessage(null);
    startTransition(async () => {
      const res = await reprocessArtifactAsTulisan(submissionId);
      if (res.error) {
        setMessage(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={handleClick}>
        {pending ? "Memproses..." : "Ini sebenarnya tulisan, proses ulang"}
      </button>
      {message && (
        <p className="hint" style={{ marginTop: 6, color: "var(--mark)" }}>
          {message}
        </p>
      )}
    </div>
  );
}
