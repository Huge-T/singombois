"use client";

import { useRef } from "react";

/** Tombol yang membuka video panduan pemakaian situs lewat <dialog> native,
 *  senada dengan pola galeri foto kegiatan di ActivityBrowser. */
export function VideoPanduanModal({ url }: { url: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  function close() {
    videoRef.current?.pause();
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        className="tombol tombol-kedua"
        onClick={() => dialogRef.current?.showModal()}
      >
        Tonton video panduan
      </button>

      <dialog
        ref={dialogRef}
        className="video-dialog"
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="giat-dialog-tutup"
            onClick={close}
            aria-label="Tutup"
          >
            ×
          </button>
          <h3>Video panduan SINGO MBOIS</h3>
          <video ref={videoRef} controls playsInline preload="none" src={url} />
        </div>
      </dialog>
    </>
  );
}
