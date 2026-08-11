"use client";

import { useState, useTransition } from "react";
import { revokeConsentAndDeleteArtifacts } from "./actions";

export function RevokeButton() {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(true)}>
        Cabut persetujuan &amp; hapus unggahan
      </button>
    );
  }

  return (
    <div className="error-box" style={{ flexBasis: "100%" }}>
      <p style={{ marginBottom: 10 }}>
        Semua foto lembar jawaban dan skor yang pernah dihitung akan dihapus permanen. Yakin?
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn btn-mark btn-sm"
          disabled={pending}
          onClick={() => startTransition(() => revokeConsentAndDeleteArtifacts())}
        >
          {pending ? "Menghapus..." : "Ya, hapus"}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
          Batal
        </button>
      </div>
    </div>
  );
}
