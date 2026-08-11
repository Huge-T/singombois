"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { openTicket } from "./actions";

export function AskExpertButton({ submissionId, sessionLabel }: { submissionId: string; sessionLabel: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handle() {
    startTransition(async () => {
      const ticketId = await openTicket(submissionId, sessionLabel);
      router.push(`/siswa/konsultasi/${ticketId}`);
    });
  }

  return (
    <button type="button" className="btn btn-sm" disabled={pending} onClick={handle}>
      {pending ? "Membuka..." : "Tanya / validasi ke ahli"}
    </button>
  );
}
