"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export interface SubmitParentReviewState {
  error?: string;
  ok?: boolean;
}

export async function submitParentReview(
  _prev: SubmitParentReviewState,
  formData: FormData
): Promise<SubmitParentReviewState> {
  // Honeypot: field tersembunyi yang manusia tidak pernah isi, tapi bot
  // pengisi-formulir otomatis sering isi — diam-diam tolak tanpa memberi
  // petunjuk ke bot bahwa ini terdeteksi.
  if (String(formData.get("website") ?? "").trim()) {
    return { ok: true };
  }

  const name = String(formData.get("name") ?? "").trim();
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();

  if (!name || name.length > 100) return { error: "Isi nama Anda (maksimal 100 karakter)." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Beri rating dulu." };
  if (comment.length < 10) return { error: "Ulasan minimal 10 karakter." };
  if (comment.length > 500) return { error: "Ulasan maksimal 500 karakter." };

  await prisma.parentReview.create({ data: { name, rating, comment } });

  revalidatePath("/");
  revalidatePath("/koordinator/tanggapan");
  return { ok: true };
}
