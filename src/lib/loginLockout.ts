import { prisma } from "@/lib/prisma";

/**
 * Penguncian akun sementara setelah beberapa kali gagal login — mencegah
 * brute-force, terutama PIN siswa 4 digit (cuma 10.000 kombinasi tanpa ini).
 */
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export function isLocked(lockedUntil: Date | null): boolean {
  return Boolean(lockedUntil && lockedUntil.getTime() > Date.now());
}

export async function registerFailedAttempt(model: "student" | "staffUser", id: string, currentAttempts: number) {
  const attempts = currentAttempts + 1;
  const data: { failedLoginAttempts: number; lockedUntil?: Date } = { failedLoginAttempts: attempts };
  if (attempts >= MAX_ATTEMPTS) {
    data.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
  }
  if (model === "student") {
    await prisma.student.update({ where: { id }, data });
  } else {
    await prisma.staffUser.update({ where: { id }, data });
  }
}

export async function clearFailedAttempts(model: "student" | "staffUser", id: string) {
  const data = { failedLoginAttempts: 0, lockedUntil: null };
  if (model === "student") {
    await prisma.student.update({ where: { id }, data });
  } else {
    await prisma.staffUser.update({ where: { id }, data });
  }
}
