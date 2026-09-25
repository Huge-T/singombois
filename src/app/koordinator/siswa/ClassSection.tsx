"use client";

import { useState } from "react";
import { ConsentButtons } from "./ConsentButtons";
import { ClassNameEditor } from "./ClassNameEditor";
import { DeleteClassButton } from "./DeleteClassButton";
import { ApproveAllButton } from "./ApproveAllButton";
import { DeleteStudentButton } from "./DeleteStudentButton";
import { HomeroomTeacherEditor } from "./HomeroomTeacherEditor";

const CONSENT_LABEL: Record<string, { label: string; tone: string }> = {
  GRANTED: { label: "DISETUJUI", tone: "pill-ok" },
  PENDING: { label: "MENUNGGU", tone: "pill-mark" },
  REVOKED: { label: "DICABUT", tone: "pill-mark" },
};

interface StudentRow {
  id: string;
  name: string;
  nisn: string;
  consentStatus: "GRANTED" | "PENDING" | "REVOKED";
}

interface TeacherOption {
  id: string;
  name: string;
}

export function ClassSection({
  classId,
  name,
  students,
  homeroomTeacherId,
  homeroomTeacherName,
  teachers,
}: {
  classId: string;
  name: string;
  students: StudentRow[];
  homeroomTeacherId: string | null;
  homeroomTeacherName: string | null;
  teachers: TeacherOption[];
}) {
  const [open, setOpen] = useState(false);
  const pendingCount = students.filter((s) => s.consentStatus === "PENDING").length;

  return (
    <div id={`kelas-${classId}`} style={{ marginBottom: 10, scrollMarginTop: 75 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            padding: "6px 0",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 11, color: "var(--tinta-lembut)" }}>{open ? "▾" : "▸"}</span>
          <span className="tbl-k" style={{ margin: 0 }}>
            {name.toUpperCase()} · {students.length} SISWA
          </span>
        </button>
        {pendingCount > 0 && (
          <span className="pill pill-mark" style={{ fontSize: 11 }}>
            {pendingCount} MENUNGGU
          </span>
        )}
        <ApproveAllButton classId={classId} pendingCount={pendingCount} />
        <ClassNameEditor classId={classId} name={name} />
        <DeleteClassButton classId={classId} name={name} studentCount={students.length} />
      </div>
      <div style={{ marginTop: 4 }}>
        <HomeroomTeacherEditor
          classId={classId}
          currentTeacherId={homeroomTeacherId}
          currentTeacherName={homeroomTeacherName}
          teachers={teachers}
        />
      </div>

      {open && (
        <div style={{ marginTop: 4 }}>
          {students.length === 0 && <p className="hint">Belum ada siswa di kelas ini.</p>}
          {students.map((s) => {
            const consent = CONSENT_LABEL[s.consentStatus];
            return (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "9px 0",
                  borderBottom: "1px solid var(--rule-soft)",
                }}
              >
                <span className="row-n" style={{ flex: 1 }}>
                  {s.name}
                </span>
                <span style={{ fontSize: 12, fontFamily: "var(--data)", color: "var(--graphite)", width: 130 }}>
                  NISN {s.nisn}
                </span>
                <span className={`pill ${consent.tone}`} style={{ width: 90, textAlign: "center" }}>
                  {consent.label}
                </span>
                <ConsentButtons studentId={s.id} status={s.consentStatus} teachers={teachers} />
                <DeleteStudentButton studentId={s.id} name={s.name} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
