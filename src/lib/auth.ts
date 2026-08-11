import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export type AppRole = "STUDENT" | "TEACHER" | "GURU_BK" | "COORDINATOR" | "ADMIN" | "SUPER_ADMIN";

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

        const student = await prisma.student.findUnique({ where: { nisn } });
        if (!student || student.archivedAt) return null;

        const ok = await bcrypt.compare(pin, student.pinHash);
        if (!ok) return null;

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

        const staff = await prisma.staffUser.findUnique({ where: { email } });
        if (!staff) return null;

        const ok = await bcrypt.compare(password, staff.passwordHash);
        if (!ok) return null;

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
