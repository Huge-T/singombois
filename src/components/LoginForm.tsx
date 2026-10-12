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

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  inputMode,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "numeric";
  autoComplete?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="input-sandi">
      <input
        id={id}
        type={shown ? "text" : "password"}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
      />
      <button
        type="button"
        className="input-sandi-mata"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? "Sembunyikan" : "Tampilkan"}
        aria-pressed={shown}
        title={shown ? "Sembunyikan" : "Tampilkan"}
      >
        {shown ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

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
              <PasswordInput
                key="pin"
                id="pin"
                inputMode="numeric"
                autoComplete="current-password"
                value={pin}
                onChange={setPin}
                placeholder="****"
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
              <PasswordInput key="password" id="password" autoComplete="current-password" value={password} onChange={setPassword} />
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
