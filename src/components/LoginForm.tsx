"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const ROLE_HOME: Record<string, string> = {
  STUDENT: "/siswa",
  TEACHER: "/guru",
  GURU_BK: "/bk",
  COORDINATOR: "/koordinator",
  ADMIN: "/koordinator",
  SUPER_ADMIN: "/koordinator",
};

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [mode, setMode] = useState<"siswa" | "staf">("siswa");
  const [nisn, setNisn] = useState("");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn(mode === "siswa" ? "student" : "staff", {
        redirect: false,
        ...(mode === "siswa" ? { nisn, pin } : { email, password }),
      });

      if (!res || res.error) {
        setError(
          mode === "siswa"
            ? "NISN atau PIN salah. Coba lagi atau minta guru mengatur ulang PIN kamu."
            : "Email atau kata sandi salah."
        );
        return;
      }

      const session = await getSession();
      const role = session?.user?.role ?? "STUDENT";
      router.push(callbackUrl || ROLE_HOME[role] || "/");
      router.refresh();
    } catch {
      // signIn/getSession bisa melempar exception (bukan cuma res.error) kalau
      // server sempat error tak terduga di tengah proses — tanpa ini tombol
      // macet permanen di "Memeriksa..." tanpa pesan apa pun ke siswa.
      setError("Terjadi kesalahan tak terduga. Coba masuk lagi sebentar lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form-card">
      <div className="seg" style={{ marginBottom: 22 }}>
        <button type="button" className={mode === "siswa" ? "on" : ""} onClick={() => setMode("siswa")}>
          Siswa
        </button>
        <button type="button" className={mode === "staf" ? "on" : ""} onClick={() => setMode("staf")}>
          Guru / Staf
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      <form onSubmit={handleSubmit}>
        {mode === "siswa" ? (
          <>
            <div className="field">
              <label htmlFor="nisn">NISN</label>
              <input
                id="nisn"
                inputMode="numeric"
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                placeholder="007001042"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="pin">PIN</label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="****"
                required
              />
              <p className="hint">Lupa PIN? Minta wali kelasmu mengatur ulang.</p>
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guru@singombois.demo"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Kata sandi</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="hint">Lupa kata sandi? Hubungi Koordinator SINGO MBOIS.</p>
            </div>
          </>
        )}

        <button className="btn btn-block" type="submit" disabled={loading}>
          {loading ? "Memeriksa..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}
