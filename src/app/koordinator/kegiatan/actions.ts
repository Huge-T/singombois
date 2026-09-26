"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/dbRetry";
import { deleteUploadedFile } from "@/lib/storage";

async function requireCoordinator() {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "COORDINATOR" && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    throw new Error("Tidak diizinkan");
  }
  return session.user;
}

export interface ActivityFormState {
  error?: string;
}

function revalidateGiatPages() {
  revalidatePath("/koordinator/kegiatan");
  revalidatePath("/giat");
  revalidatePath("/");
}

export async function createActivity(_prev: ActivityFormState, formData: FormData): Promise<ActivityFormState> {
  const user = await requireCoordinator();
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const year = Number(formData.get("year"));

  if (!title) return { error: "Judul kegiatan wajib diisi." };
  if (!category) return { error: "Kategori wajib diisi." };
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: "Tahun tidak valid." };

  await prisma.activity.create({
    data: { schoolId: user.schoolId, title, category, year },
  });
  revalidateGiatPages();
  return {};
}

export async function deleteActivity(activityId: string) {
  await requireCoordinator();

  const photos = await withRetry(() =>
    prisma.activityPhoto.findMany({ where: { activityId }, select: { url: true } })
  );
  for (const photo of photos) {
    await deleteUploadedFile(photo.url);
  }

  await withRetry(() =>
    prisma.$transaction([
      prisma.activityPhoto.deleteMany({ where: { activityId } }),
      prisma.activity.delete({ where: { id: activityId } }),
    ])
  );
  revalidateGiatPages();
}

export async function deleteActivityPhoto(photoId: string) {
  await requireCoordinator();

  const photo = await withRetry(() => prisma.activityPhoto.findUnique({ where: { id: photoId } }));
  if (!photo) return;
  await deleteUploadedFile(photo.url);
  await prisma.activityPhoto.delete({ where: { id: photoId } });
  revalidateGiatPages();
}
