"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Role yang boleh dibuat lewat form ini (bukan ADMIN/SUPER_ADMIN — akun
// setingkat itu sengaja tidak self-service, diminta langsung ke pengembang).
const CREATABLE_ROLES = ["TEACHER", "GURU_BK", "COORDINATOR"] as const;
type CreatableRole = (typeof CREATABLE_ROLES)[number];

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

export interface AddStaffState {
  error?: string;
  created?: { name: string; email: string; role: string };
}

export async function addStaff(_prev: AddStaffState, formData: FormData): Promise<AddStaffState> {
  const user = await requireCoordinator();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Nama wajib diisi." };
  if (!email || !email.includes("@")) return { error: "Email tidak valid." };
  if (!CREATABLE_ROLES.includes(role as CreatableRole)) return { error: "Peran tidak valid." };
  if (password.length < 8) return { error: "Kata sandi minimal 8 karakter." };

  const exists = await prisma.staffUser.findUnique({ where: { email } });
  if (exists) return { error: "Email ini sudah terdaftar sebagai akun staf." };

  const created = await prisma.staffUser.create({
    data: {
      schoolId: user.schoolId,
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: role as CreatableRole,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      actorType: "staff",
      action: "CREATE_STAFF",
      entity: "StaffUser",
      entityId: created.id,
    },
  });

  revalidatePath("/koordinator/staf");
  return { created: { name: created.name, email: created.email, role: created.role } };
}
