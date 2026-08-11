"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  schoolName: z.string().min(3, "Nama sekolah minimal 3 karakter"),
  contactName: z.string().min(3, "Nama kontak minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  message: z.string().min(10, "Ceritakan sedikit kebutuhan sekolah Anda (minimal 10 karakter)"),
});

export interface ContactFormState {
  ok: boolean;
  error?: string;
}

export async function submitInterest(_prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const parsed = schema.safeParse({
    schoolName: formData.get("schoolName"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  await prisma.contactLead.create({ data: parsed.data });
  return { ok: true };
}
