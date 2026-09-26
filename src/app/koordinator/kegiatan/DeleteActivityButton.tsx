"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteActivity } from "./actions";

export function DeleteActivityButton({ activityId, title }: { activityId: string; title: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Hapus kegiatan "${title}" beserta semua fotonya secara permanen?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteActivity(activityId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menghapus");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={handleDelete}>
        {pending ? "..." : "Hapus kegiatan"}
      </button>
      {error && <span style={{ color: "var(--mark)", fontSize: 12 }}>{error}</span>}
    </span>
  );
}
