"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setContactLeadHandled } from "./actions";

export function ContactLeadToggle({ leadId, handled }: { leadId: string; handled: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      await setContactLeadHandled(leadId, !handled);
      router.refresh();
    });
  }

  return (
    <button type="button" className={`btn btn-sm ${handled ? "btn-ghost" : ""}`} disabled={pending} onClick={toggle}>
      {pending ? "..." : handled ? "Tandai belum ditindaklanjuti" : "Tandai sudah dihubungi"}
    </button>
  );
}
