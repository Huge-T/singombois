"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { replyTicket, closeTicket } from "./actions";

export function ReplyForm({ ticketId, closed }: { ticketId: string; closed: boolean }) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!body.trim()) return;
    startTransition(async () => {
      await replyTicket(ticketId, body);
      setBody("");
      router.refresh();
    });
  }

  function close() {
    startTransition(async () => {
      await closeTicket(ticketId);
      router.refresh();
    });
  }

  if (closed) {
    return <p className="hint">Tiket ini sudah ditutup.</p>;
  }

  return (
    <div className="field">
      <label htmlFor="balasan">Balasan</label>
      <textarea
        id="balasan"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Tulis balasan untuk siswa..."
      />
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button type="button" className="btn" disabled={pending || !body.trim()} onClick={submit}>
          {pending ? "Mengirim..." : "Kirim balasan"}
        </button>
        <button type="button" className="btn btn-ghost" disabled={pending} onClick={close}>
          Tutup tiket
        </button>
      </div>
    </div>
  );
}
