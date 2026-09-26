"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteActivityPhoto } from "./actions";

export function DeletePhotoButton({ photoId }: { photoId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Hapus foto ini?")) return;
    startTransition(async () => {
      await deleteActivityPhoto(photoId);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      aria-label="Hapus foto"
      style={{
        position: "absolute",
        top: 4,
        right: 4,
        width: 22,
        height: 22,
        borderRadius: "50%",
        border: "none",
        background: "rgba(19, 28, 61, 0.7)",
        color: "#fff",
        fontSize: 13,
        lineHeight: 1,
        cursor: "pointer",
      }}
    >
      ×
    </button>
  );
}
