"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function resetStudentPin(studentId: string): Promise<string> {
  const session = await auth();
  const role = session?.user.role;
  if (!session?.user || (role !== "TEACHER" && role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    throw new Error("Tidak diizinkan");
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.schoolId !== session.user.schoolId) throw new Error("Siswa tidak ditemukan");

  if (role === "TEACHER") {
    const isHomeroom = await prisma.class.findFirst({ where: { id: student.classId, homeroomTeacherId: session.user.id } });
    if (!isHomeroom) throw new Error("Tidak diizinkan");
  }

  const newPin = String(Math.floor(1000 + Math.random() * 9000));
  await prisma.student.update({
    where: { id: studentId },
    data: { pinHash: await bcrypt.hash(newPin, 10) },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      actorType: "staff",
      action: "RESET_STUDENT_PIN",
      entity: "Student",
      entityId: studentId,
    },
  });

  return newPin;
}
