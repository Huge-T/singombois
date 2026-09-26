"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { compressImageForUpload } from "@/lib/clientImageCompress";

export function AddPhotoForm({ activityId }: { activityId: string }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const compressed = await compressImageForUpload(file);
      if (compressed.size > 4 * 1024 * 1024) {
        setError("Foto terlalu besar dan tidak bisa dikompres otomatis. Coba format JPG/PNG lain.");
        return;
      }
      const fd = new FormData();
      fd.append("file", compressed);
      const res = await fetch(`/api/koordinator/kegiatan-upload/${activityId}`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengunggah foto.");
        return;
      }
      router.refresh();
    } catch {
      setError("Terjadi kesalahan tak terduga. Coba unggah ulang.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="btn btn-sm" style={{ cursor: uploading ? "not-allowed" : "pointer" }}>
        {uploading ? "Mengunggah..." : "+ Tambah foto"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif"
          disabled={uploading}
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </label>
      {error && <p style={{ color: "var(--mark)", fontSize: 12, marginTop: 6 }}>{error}</p>}
    </div>
  );
}
