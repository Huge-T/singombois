import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { clearFailedAttempts, isLocked, registerFailedAttempt } from "@/lib/loginLockout";

export type AppRole = "STUDENT" | "TEACHER" | "GURU_BK" | "COORDINATOR" | "ADMIN" | "SUPER_ADMIN";

// Database gratis (Neon) menangguhkan compute-nya saat tidak dipakai, dan makin
// terasa saat banyak siswa login bersamaan (jam pelajaran) — permintaan pertama
// kadang gagal duluan sebelum compute "bangun". Coba ulang sekali di sini supaya
// login tidak ikut gagal karena hal yang sebetulnya transien.
async function withRetry<T>(fn: () => Promise<T>, attempts = 2, delayMs = 1200): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      role: AppRole;
      schoolId: string;
      classId?: string;
      email?: string | null;
    };
  }
}

interface AppToken {
  id: string;
  name: string;
  role: AppRole;
  schoolId: string;
  classId?: string;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  // Self-hosted deployments (no platform-provided host header verification like
  // Vercel's) need this explicitly, or Auth.js v5 rejects every request in
  // production with "UntrustedHost".
  trustHost: true,
  pages: {
    signIn: "/masuk",
  },
  providers: [
    Credentials({
      id: "student",
      name: "Siswa",
      credentials: {
        nisn: { label: "NISN", type: "text" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(creds) {
        const nisn = String(creds?.nisn ?? "").trim();
        const pin = String(creds?.pin ?? "").trim();
        if (!nisn || !pin) return null;

        // NISN asli sering diawali 0 (10 digit), tapi Excel di rapor/daftar cetak
        // rutin membuang nol di depan angka — siswa lalu login dengan versi 9
        // digit yang salah tanpa sadar. Coba versi diberi nol di depan sebelum
        // menyerah, sebelum reguler daftar 10 digit ini mengganggu login massal.
        let student = await withRetry(() => prisma.student.findUnique({ where: { nisn } }));
        if (!student && /^\d+$/.test(nisn) && nisn.length < 10) {
          student = await withRetry(() => prisma.student.findUnique({ where: { nisn: nisn.padStart(10, "0") } }));
        }
        if (!student || student.archivedAt) return null;
        if (isLocked(student.lockedUntil)) return null;

        const ok = await bcrypt.compare(pin, student.pinHash);
        if (!ok) {
          await registerFailedAttempt("student", student.id, student.failedLoginAttempts);
          return null;
        }
        await clearFailedAttempts("student", student.id);

        return {
          id: student.id,
          name: student.name,
          role: "STUDENT" as AppRole,
          schoolId: student.schoolId,
          classId: student.classId,
        };
      },
    }),
    Credentials({
      id: "staff",
      name: "Staf",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        const staff = await withRetry(() => prisma.staffUser.findUnique({ where: { email } }));
        if (!staff) return null;
        if (isLocked(staff.lockedUntil)) return null;

        const ok = await bcrypt.compare(password, staff.passwordHash);
        if (!ok) {
          await registerFailedAttempt("staffUser", staff.id, staff.failedLoginAttempts);
          return null;
        }
        await clearFailedAttempts("staffUser", staff.id);

        return {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role as AppRole,
          schoolId: staff.schoolId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const t = token as unknown as AppToken;
      if (user) {
        t.id = user.id as string;
        t.name = user.name as string;
        t.role = (user as { role: AppRole }).role;
        t.schoolId = (user as { schoolId: string }).schoolId;
        t.classId = (user as { classId?: string }).classId;
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as unknown as AppToken;
      session.user.id = t.id;
      session.user.name = t.name;
      session.user.role = t.role;
      session.user.schoolId = t.schoolId;
      session.user.classId = t.classId;
      return session;
    },
  },
});
