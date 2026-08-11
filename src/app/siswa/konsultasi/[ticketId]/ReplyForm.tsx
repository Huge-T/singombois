"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { replyAsStudent } from "./actions";

export function ReplyForm({ ticketId, closed }: { ticketId: string; closed: boolean }) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!body.trim()) return;
    startTransition(async () => {
      await replyAsStudent(ticketId, body);
      setBody("");
      router.refresh();
    });
  }

  if (closed) {
    return <p className="hint">Tiket ini sudah ditutup tim BK.</p>;
  }

  return (
    <div className="field">
      <label htmlFor="pesan">Pesanmu</label>
      <textarea
        id="pesan"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Tulis pertanyaanmu..."
      />
      <button type="button" className="btn" disabled={pending || !body.trim()} onClick={submit} style={{ marginTop: 10 }}>
        {pending ? "Mengirim..." : "Kirim"}
      </button>
    </div>
  );
}
