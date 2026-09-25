"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { recordListening, recordReading } from "./actions";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface OpenQuestion {
  question: string;
  repeat?: number;
}

type Step = "baca" | "soal-baca" | "simak" | "soal-simak" | "cerita" | "tulis" | "unggah";

interface GateFlag {
  code: string;
  message: string;
}

// Vercel menolak body request di atas kira-kira 4.5MB di level platform,
// sebelum kode route manapun sempat jalan (respons plain-text non-JSON,
// bukan JSON error yang rapi) — foto kamera HP modern rutin 3-8MB, jadi
// kompres dulu di browser supaya jauh di bawah batas itu. Kalau browser
// gagal mendekode (mis. HEIC di Chrome), kirim berkas asli apa adanya dan
// biarkan server yang menolak dengan pesan yang jelas.
const UPLOAD_SKIP_COMPRESS_BYTES = 1.5 * 1024 * 1024;
const UPLOAD_TARGET_BYTES = 2 * 1024 * 1024;
const UPLOAD_MAX_DIMENSION = 2000;

async function compressImageForUpload(file: File): Promise<File> {
  if (file.size <= UPLOAD_SKIP_COMPRESS_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > UPLOAD_MAX_DIMENSION || height > UPLOAD_MAX_DIMENSION) {
      const scale = UPLOAD_MAX_DIMENSION / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = 0.85;
    for (let i = 0; i < 4; i++) {
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob) return file;
      if (blob.size <= UPLOAD_TARGET_BYTES || quality <= 0.4) {
        const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
        return new File([blob], newName, { type: "image/jpeg" });
      }
      quality -= 0.15;
    }
    return file;
  } catch {
    return file;
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* Kartu langkah dengan baris tombol sticky di dasarnya, jadi tombol
   Kembali/Lanjut selalu terlihat walau isi kartunya panjang. */
function KartuLangkah({ aksi, children }: { aksi?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="sesi-kartu">
      {children}
      {aksi && <div className="sesi-aksi">{aksi}</div>}
    </section>
  );
}

function OpsiLjk({
  name,
  options,
  value,
  onPick,
}: {
  name: string;
  options: string[];
  value: number;
  onPick: (index: number) => void;
}) {
  return (
    <>
      {options.map((opt, oi) => (
        <label key={oi} className="opt opt-ljk">
          <input type="radio" name={name} checked={value === oi} onChange={() => onPick(oi)} />
          <span className="ljk-huruf" aria-hidden="true">
            {String.fromCharCode(65 + oi)}
          </span>
          <span className="lbl">{opt}</span>
        </label>
      ))}
    </>
  );
}

const IkonJam = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2.5M9 2h6" />
  </svg>
);

const IkonInfo = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h.01M12 11v5" />
  </svg>
);

const IkonUnggah = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M12 16V8m0 0-3.5 3.5M12 8l3.5 3.5" />
    <path d="M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5" />
  </svg>
);

export function SessionRunner({
  submissionId,
  sessionLabel,
  level,
  consentGranted,
  reading,
  listening,
  story,
  worksheetName,
  studentName,
  studentClass,
}: {
  submissionId: string;
  sessionLabel: string;
  level: string | null; // terisi (LOW/MIDDLE/HIGH) untuk sesi Gestalt, null untuk literasi umum
  consentGranted: boolean;
  reading: { title: string; body: string; quiz: QuizQuestion[]; openQuestions: OpenQuestion[] } | null;
  listening: {
    title: string;
    fileUrl: string;
    quiz: QuizQuestion[];
    maxPlays: number;
    openQuestions: OpenQuestion[];
    questionsAudioUrl: string | null;
  } | null;
  story: { title: string; starterText: string; imageUrl: string | null } | null;
  worksheetName: string;
  studentName: string;
  studentClass: string;
}) {
  const router = useRouter();
  const isGestalt = Boolean(story);

  // Urutan langkah dinamis (Gestalt): baca + soal baca dulu (bila ada teks),
  // lalu simak + soal simak (bila ada audio), gambar bercerita, unggah.
  // Low = baca-soal-simak-soal-cerita-unggah; Middle/High = simak-soal-cerita-
  // unggah; literasi umum = alur lama.
  const soalBacaAda = Boolean(reading && reading.openQuestions.length > 0);
  const soalSimakAda = Boolean(listening && listening.openQuestions.length > 0);
  const duaSetSoal = soalBacaAda && soalSimakAda;
  // Penomoran bagian lembar kerja bergeser bila ada dua set soal:
  // soal baca = A, soal simak = B, cerita = C; bila hanya satu set soal,
  // soal = A dan cerita = B (perilaku lama).
  const bagianSoalBaca = "A";
  const bagianSoalSimak = duaSetSoal ? "B" : "A";
  const bagianCerita = duaSetSoal ? "C" : "B";

  const steps: { key: Step; label: string }[] = isGestalt
    ? [
        ...(reading ? [{ key: "baca" as Step, label: "Baca" }] : []),
        ...(soalBacaAda ? [{ key: "soal-baca" as Step, label: duaSetSoal ? "Soal Baca" : "Soal" }] : []),
        ...(listening ? [{ key: "simak" as Step, label: "Simak" }] : []),
        ...(soalSimakAda ? [{ key: "soal-simak" as Step, label: duaSetSoal ? "Soal Simak" : "Soal" }] : []),
        { key: "cerita", label: "Gambar" },
        { key: "unggah", label: "Unggah" },
      ]
    : [
        { key: "baca", label: "Baca" },
        { key: "simak", label: "Simak" },
        { key: "tulis", label: "Tulis" },
        { key: "unggah", label: "Unggah" },
      ];

  const [step, setStep] = useState<Step>(steps[0].key);
  const readStart = useRef(0);
  useEffect(() => {
    readStart.current = Date.now();
  }, []);

  // Saat pindah langkah, gulir kembali ke atas halaman.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Penanda waktu berjalan sejak siswa mulai mengerjakan (informatif, bukan
  // batas waktu — tes ini tidak menilai kecepatan).
  const [elapsedS, setElapsedS] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      if (readStart.current) setElapsedS(Math.floor((Date.now() - readStart.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const fmtElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const mm = `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return h > 0 ? `${h}:${mm}` : mm;
  };

  const [readingAnswers, setReadingAnswers] = useState<number[]>(() => (reading?.quiz ?? []).map(() => -1));
  const [listeningAnswers, setListeningAnswers] = useState<number[]>(() => (listening?.quiz ?? []).map(() => -1));
  const [audioPlays, setAudioPlays] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [listeningSubmitted, setListeningSubmitted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Audio pembacaan soal menyimak: jatah putar terpisah dari audio teks.
  // Pengulangan tiap soal sudah terekam di dalam file, jadi 2 putaran cukup.
  const SOAL_AUDIO_MAX_PLAYS = 2;
  const [soalAudioPlays, setSoalAudioPlays] = useState(0);
  const [showSoalText, setShowSoalText] = useState(false);
  const soalAudioRef = useRef<HTMLAudioElement>(null);
  function handleSoalAudioPlay() {
    if (soalAudioPlays >= SOAL_AUDIO_MAX_PLAYS) {
      soalAudioRef.current?.pause();
      return;
    }
    setSoalAudioPlays((p) => p + 1);
  }

  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<"TULISAN" | "GAMBAR">("TULISAN");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<GateFlag[] | string | null>(null);
  const [uploadOk, setUploadOk] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepIdx = steps.findIndex((s) => s.key === step);

  function nextStep() {
    if (stepIdx >= 0 && stepIdx < steps.length - 1) setStep(steps[stepIdx + 1].key);
  }

  // Tombol kembali & stepper: jawaban tersimpan di state, jadi siswa bisa
  // mundur ke langkah yang sudah dilewati untuk mengecek ulang tanpa
  // kehilangan isian (jatah putar audio tidak di-reset). Melompat maju
  // lewat stepper tidak bisa; maju hanya lewat tombol di kartu.
  function prevStep() {
    if (stepIdx > 0) setStep(steps[stepIdx - 1].key);
  }

  const backButton = stepIdx > 0 && (
    <button type="button" className="btn btn-ghost" onClick={prevStep} disabled={uploading || uploadOk}>
      Kembali
    </button>
  );

  async function finishReading() {
    const seconds = Math.round((Date.now() - readStart.current) / 1000);
    await recordReading(submissionId, seconds, readingAnswers);
    nextStep();
  }

  // Cegah "dengar ulang tanpa batas" lewat geser slider mundur selagi audio
  // masih berjalan (jatah putar cuma bertambah lewat event "play" — kalau
  // audio tidak pernah berhenti, penghitung tidak pernah naik lagi). Geser
  // slider selagi audio berhenti tetap diizinkan (mis. reset ke awal sebelum
  // menekan putar untuk jatah berikutnya).
  const audioIsPlayingRef = useRef(false);
  const listeningMaxTimeRef = useRef(0);

  function handleAudioTimeUpdate() {
    if (audioRef.current && audioRef.current.currentTime > listeningMaxTimeRef.current) {
      listeningMaxTimeRef.current = audioRef.current.currentTime;
    }
  }

  function handleAudioSeeking() {
    if (!audioIsPlayingRef.current || !audioRef.current) return;
    if (audioRef.current.currentTime < listeningMaxTimeRef.current - 0.5) {
      audioRef.current.currentTime = listeningMaxTimeRef.current;
    }
  }

  function handleAudioPause() {
    audioIsPlayingRef.current = false;
  }

  function handleAudioPlay() {
    if (!listening) return;
    if (audioPlays >= listening.maxPlays) {
      audioRef.current?.pause();
      return;
    }
    audioIsPlayingRef.current = true;
    setAudioPlays((p) => p + 1);
  }

  async function finishListening() {
    await recordListening(submissionId, audioPlays, listeningAnswers);
    if (isGestalt) {
      nextStep();
    } else {
      setListeningSubmitted(true);
    }
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploadFile = await compressImageForUpload(file);
      // Kalau kompresi gagal (mis. HEIC yang tidak bisa didekode browser ini)
      // dan berkas asli masih terlalu besar, server Vercel akan menolaknya
      // dengan respons non-JSON sebelum kode kita sempat jalan sama sekali —
      // cegat di sini dengan pesan yang jelas, jangan sampai stuck di catch umum.
      if (uploadFile.size > 4 * 1024 * 1024) {
        setUploadError("Foto terlalu besar dan tidak bisa dikompres otomatis. Coba ganti format foto ke JPG/PNG, atau kurangi resolusi kamera.");
        return;
      }
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("kind", kind);
      const res = await fetch(`/api/upload/${submissionId}`, { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.flags ?? data.error ?? "Gagal mengunggah");
        return;
      }
      setUploadOk(true);
      setTimeout(() => router.push(`${window.location.pathname}/hasil`), 400);
    } catch {
      // Respons gagal diparse (server error tak terduga/koneksi putus) — jangan
      // biarkan tombol macet permanen di "Menganalisis...".
      setUploadError("Terjadi kesalahan tak terduga. Coba unggah ulang.");
    } finally {
      setUploading(false);
    }
  }

  const infoLembarKerja = (
    <div className="sesi-info">
      {IkonInfo}
      <div>
        <b>Siapkan lembar kerjamu</b>
        <p>
          Gunakan <b>{worksheetName}</b>. Jawaban ditulis tangan di lembar kerja, lalu difoto di
          langkah Unggah. Tidak ada batas waktu — kerjakan dengan tenang.
        </p>
      </div>
    </div>
  );

  return (
    <div className="sesi-runner">
      <p className="crumb">
        SESI · {sessionLabel.toUpperCase()}
        {level ? ` · LEVEL ${level}` : ""}
      </p>
      <div className="sesi-kepala">
        <h2 className="h2" style={{ marginBottom: 0 }}>
          Kerjakan sesi
        </h2>
        <div className="sesi-kepala-kanan">
          <span className="sesi-siswa-chip">
            <span className="av">{initials(studentName)}</span>
            {studentName} · {studentClass}
          </span>
          <span className="sesi-waktu" aria-label="Waktu berjalan sejak mulai mengerjakan">
            {IkonJam}
            Waktu berjalan · <b>{fmtElapsed(elapsedS)}</b>
          </span>
          <Link href="/siswa" className="btn btn-ghost btn-sm">
            Keluar sesi
          </Link>
        </div>
      </div>

      <nav className="sesi-stepper" aria-label="Langkah pengerjaan">
        {steps.map((s, i) => (
          <button
            key={s.key}
            type="button"
            className={`sesi-step${i === stepIdx ? " aktif" : i < stepIdx ? " selesai" : ""}`}
            aria-current={i === stepIdx ? "step" : undefined}
            disabled={i >= stepIdx || uploading || uploadOk}
            onClick={() => setStep(s.key)}
          >
            <span className="dot">{i < stepIdx ? "✓" : i + 1}</span>
            <span className="lbl">{s.label}</span>
          </button>
        ))}
      </nav>

      {step === "baca" && reading && (
        <KartuLangkah
          aksi={
            <>
              {backButton || <span />}
              <button className="btn" onClick={finishReading} disabled={readingAnswers.some((a) => a === -1)}>
                {isGestalt && soalBacaAda ? "Lanjut ke Soal" : "Lanjut ke Simak"}
              </button>
            </>
          }
        >
          <h3>{reading.title}</h3>
          <p className="sesi-lead">Bacalah teks berikut dengan bersungguh-sungguh.</p>
          {stepIdx === 0 && infoLembarKerja}
          <p className="sesi-bacaan">{reading.body}</p>

          {reading.quiz.length > 0 && (
            <div style={{ marginTop: 20 }}>
              {reading.quiz.map((q, qi) => (
                <div key={qi} className="field">
                  <label>{q.question}</label>
                  <OpsiLjk
                    name={`read-q${qi}`}
                    options={q.options}
                    value={readingAnswers[qi]}
                    onPick={(oi) => {
                      const next = [...readingAnswers];
                      next[qi] = oi;
                      setReadingAnswers(next);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </KartuLangkah>
      )}

      {step === "simak" && listening && (
        <KartuLangkah
          aksi={
            isGestalt ? (
              <>
                {backButton || <span />}
                <button className="btn" onClick={finishListening}>
                  {soalSimakAda ? "Lanjut ke Soal" : "Lanjut ke Gambar"}
                </button>
              </>
            ) : !listeningSubmitted ? (
              <>
                {backButton || <span />}
                <button
                  className="btn"
                  onClick={finishListening}
                  disabled={listeningAnswers.some((a) => a === -1)}
                >
                  Kumpulkan jawaban menyimak
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-ghost" onClick={() => setShowTranscript((v) => !v)}>
                  {showTranscript ? "Sembunyikan transkrip" : "Tampilkan transkrip (aksesibilitas)"}
                </button>
                <button className="btn" onClick={() => setStep("tulis")}>
                  Lanjut ke Tulis
                </button>
              </>
            )
          }
        >
          <h3>{listening.title}</h3>
          <p className="sesi-lead">Dengarkan teks berikut dengan bersungguh-sungguh.</p>
          {stepIdx === 0 && infoLembarKerja}
          <p style={{ fontSize: 12.5, color: "var(--graphite)", fontFamily: "var(--data)", marginBottom: 16 }}>
            PUTAR TERPAKAI: {audioPlays}/{listening.maxPlays}
          </p>

          {listening.fileUrl ? (
            <audio
              ref={audioRef}
              controls
              src={listening.fileUrl}
              onPlay={handleAudioPlay}
              onPause={handleAudioPause}
              onTimeUpdate={handleAudioTimeUpdate}
              onSeeking={handleAudioSeeking}
              style={{ width: "100%", marginBottom: 20 }}
            />
          ) : (
            <div className="error-box">Audio belum tersedia untuk sesi ini.</div>
          )}

          {listening.quiz.map((q, qi) => (
            <div key={qi} className="field">
              <label>{q.question}</label>
              <OpsiLjk
                name={`listen-q${qi}`}
                options={q.options}
                value={listeningAnswers[qi]}
                onPick={(oi) => {
                  const next = [...listeningAnswers];
                  next[qi] = oi;
                  setListeningAnswers(next);
                }}
              />
            </div>
          ))}
        </KartuLangkah>
      )}

      {step === "soal-baca" && reading && (
        <KartuLangkah
          aksi={
            <>
              {backButton || <span />}
              <button className="btn" onClick={nextStep}>
                {listening ? "Lanjut ke Simak" : "Sudah selesai menjawab"}
              </button>
            </>
          }
        >
          <h3>Jawablah pertanyaan berikut!</h3>
          <p className="sesi-lead">
            Tulis jawabanmu <b>dengan tulisan tangan</b> di lembar kerja <b>Bagian {bagianSoalBaca}</b>.
            Beri nomor tiap jawaban sesuai nomor di bawah. Jawaban tidak diketik di layar; tulisan
            tanganmulah yang dibaca.
          </p>
          <ol className="sesi-qlist">
            {reading.openQuestions.map((q, i) => (
              <li key={i}>{q.question}</li>
            ))}
          </ol>
        </KartuLangkah>
      )}

      {/* Soal menyimak: bila ada rekaman pembacaan soal, teks soal disembunyikan
          default supaya yang terukur benar-benar kemampuan menyimak (bukan
          membaca) — sesuai desain psikolog tim. Toggle teks tetap disediakan
          untuk aksesibilitas. Tanpa rekaman, soal tampil sebagai teks dan
          dibacakan guru sesuai tanda pengulangan. */}
      {step === "soal-simak" && listening && (
        <KartuLangkah
          aksi={
            <>
              {backButton || <span />}
              <button className="btn" onClick={nextStep}>
                Sudah selesai menjawab
              </button>
            </>
          }
        >
          <h3>Jawablah pertanyaan menyimak!</h3>
          {listening.questionsAudioUrl ? (
            <>
              <p className="sesi-lead">
                Soal <b>dibacakan lewat audio</b> dan tidak ditampilkan sebagai teks — dengarkan
                baik-baik. Ada <b>{listening.openQuestions.length} soal</b>, dan setiap soal sudah
                dibacakan berulang di dalam rekaman. Tulis jawabanmu <b>dengan tulisan tangan</b> di
                lembar kerja <b>Bagian {bagianSoalSimak}</b>, beri nomor 1–
                {listening.openQuestions.length}. Tidak ada batas waktu; kamu boleh menjeda audio
                untuk menulis jawaban sebelum melanjutkan.
              </p>
              <p style={{ fontSize: 12.5, color: "var(--graphite)", fontFamily: "var(--data)", marginBottom: 14 }}>
                PUTAR SOAL TERPAKAI: {soalAudioPlays}/{SOAL_AUDIO_MAX_PLAYS}
              </p>
              <audio
                ref={soalAudioRef}
                controls
                src={listening.questionsAudioUrl}
                onPlay={handleSoalAudioPlay}
                style={{ width: "100%", marginBottom: 16 }}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginBottom: 12 }}
                onClick={() => setShowSoalText((v) => !v)}
              >
                {showSoalText ? "Sembunyikan teks soal" : "Tampilkan teks soal (aksesibilitas)"}
              </button>
              {showSoalText && (
                <ol className="sesi-qlist">
                  {listening.openQuestions.map((q, i) => (
                    <li key={i}>
                      {q.question}
                      {q.repeat && q.repeat > 1 && (
                        <span className="pill pill-singo" style={{ marginLeft: 8 }}>
                          dibacakan {q.repeat}x
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </>
          ) : (
            <>
              <p className="sesi-lead">
                Tulis jawabanmu <b>dengan tulisan tangan</b> di lembar kerja{" "}
                <b>Bagian {bagianSoalSimak}</b>. Beri nomor tiap jawaban sesuai nomor di bawah. Soal
                dengan tanda pengulangan dibacakan gurumu sebanyak itu.
              </p>
              <ol className="sesi-qlist">
                {listening.openQuestions.map((q, i) => (
                  <li key={i}>
                    {q.question}
                    {q.repeat && q.repeat > 1 && (
                      <span className="pill pill-singo" style={{ marginLeft: 8 }}>
                        dibacakan {q.repeat}x
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </>
          )}
        </KartuLangkah>
      )}

      {step === "cerita" && story && (
        <KartuLangkah
          aksi={
            <>
              {backButton || <span />}
              <button className="btn" onClick={nextStep}>
                Sudah selesai menulis cerita
              </button>
            </>
          }
        >
          <h3>Gambar bercerita</h3>
          <p className="sesi-lead">
            Amatilah gambar berikut dengan seksama, lalu <b>lanjutkan ceritanya dengan tulisan
            tanganmu</b> di lembar kerja <b>Bagian {bagianCerita}</b>. Kalimat pembukanya sudah
            tercetak di lembarmu.
          </p>
          {story.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="sesi-gambar" src={story.imageUrl} alt={`Gambar bercerita: ${story.title}`} />
          ) : (
            <div className="sesi-gambar-kosong">
              Gambar {story.title} ditampilkan di sini (lihat juga lembar kerja cetak dari gurumu).
            </div>
          )}
          <p className="sesi-pembuka">{story.starterText} …</p>
        </KartuLangkah>
      )}

      {step === "tulis" && (
        <KartuLangkah
          aksi={
            <>
              {backButton || <span />}
              <button className="btn" onClick={() => setStep("unggah")}>
                Sudah selesai menulis
              </button>
            </>
          }
        >
          <h3>Kerjakan di kertas</h3>
          <p className="sesi-lead">
            Tulis jawabanmu tangan di <b>{worksheetName}</b> yang dibagikan gurumu. Tulis senormal
            biasa. Sistem ini menilai keterbacaan dan kerapian, bukan kecepatan menulis.
          </p>
        </KartuLangkah>
      )}

      {step === "unggah" && (
        <KartuLangkah
          aksi={
            !consentGranted ? (
              <>
                {backButton}
                <span />
              </>
            ) : (
              <>
                {backButton || <span />}
                <button className="btn" onClick={handleUpload} disabled={!file || uploading || uploadOk}>
                  {uploading ? "Menganalisis..." : "Unggah & Analisis"}
                </button>
              </>
            )
          }
        >
          <h3>Foto lembar jawabanmu</h3>

          {!consentGranted ? (
            <div className="error-box">
              Persetujuan wali murid untuk sesi ini belum disetujui. Unggah foto diblokir sampai
              persetujuan dikonfirmasi oleh sekolah.
            </div>
          ) : (
            <>
              <p className="sesi-lead">
                Foto di tempat terang, kamera tegak lurus di atas kertas, seluruh lembar masuk
                bingkai. Belum yakin? Pakai tombol <b>Kembali</b> untuk mengecek ulang jawabanmu
                dulu; isianmu tidak hilang.
              </p>

              <div className="field">
                <label>Jenis karya</label>
                <div className="seg">
                  <button type="button" className={kind === "TULISAN" ? "on" : ""} onClick={() => setKind("TULISAN")}>
                    Tulisan
                  </button>
                  <button type="button" className={kind === "GAMBAR" ? "on" : ""} onClick={() => setKind("GAMBAR")}>
                    Gambar
                  </button>
                </div>
                <p className="hint">
                  {kind === "GAMBAR"
                    ? "Gambar dibaca langsung oleh tim ahli, tanpa skor kerapian teknis."
                    : "Tulisan tangan diukur otomatis (kemiringan, ukuran, spasi, kerapian) lalu dibaca tim ahli."}
                </p>
              </div>

              {uploadError && (
                <div className="error-box">
                  {Array.isArray(uploadError) ? (
                    <ul style={{ paddingLeft: 18 }}>
                      {uploadError.map((f) => (
                        <li key={f.code}>{f.message}</li>
                      ))}
                    </ul>
                  ) : (
                    uploadError
                  )}
                </div>
              )}
              {uploadOk && (
                <div className="notice-box">
                  {kind === "GAMBAR"
                    ? "Foto diterima dan masuk antrean pembacaan tim ahli. Mengarahkan ke hasil..."
                    : "Foto diterima dan sudah dianalisis. Mengarahkan ke hasil..."}
                </div>
              )}

              <button
                type="button"
                className={`sesi-dropzone${dragging ? " seret" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) setFile(dropped);
                }}
              >
                {IkonUnggah}
                {file ? (
                  <>
                    <b>{file.name}</b>
                    <span>
                      {(file.size / 1024 / 1024).toFixed(1)} MB · ketuk untuk mengganti foto
                    </span>
                  </>
                ) : (
                  <>
                    <b>Ketuk untuk memilih foto</b>
                    <span>atau seret file ke sini · JPG / PNG / HEIC</span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/heic,image/heif"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </>
          )}
        </KartuLangkah>
      )}
    </div>
  );
}
