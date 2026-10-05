import type { AppRole } from "@/lib/auth";

export const ROLE_HOME: Record<AppRole, string> = {
  STUDENT: "/siswa",
  TEACHER: "/guru",
  GURU_BK: "/bk",
  COORDINATOR: "/koordinator",
  ADMIN: "/koordinator",
  SUPER_ADMIN: "/koordinator",
};
