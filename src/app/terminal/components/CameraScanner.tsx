"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

/** A message the operator can act on, instead of a silent close. */
function describeCameraError(err: unknown): string {
  const name = typeof err === "object" && err && "name" in err ? String((err as { name: unknown }).name) : "";
  const text = String(err);
  if (name === "NotAllowedError" || /permission|denied|not allowed/i.test(text)) {
    return "Camera access is blocked. Allow the camera for this site in the browser's address bar, then try again.";
  }
  if (name === "NotFoundError" || /no camera|not found|requested device/i.test(text)) {
    return "No camera was found on this device.";
  }
  if (name === "NotReadableError" || /in use|not readable|could not start/i.test(text)) {
    return "The camera is being used by another app or tab. Close it and try again.";
  }
  return "The camera could not be started. Try again, or scan an image file instead.";
}

export default function CameraScanner({
  onScan,
  onClose,
}: {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const stoppingRef = useRef(false);
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let isMounted = true;
    let scanner: Html5Qrcode | null = null;

    // Small delay to bypass React Strict Mode's immediate mount-unmount-mount cycle, which would
    // otherwise create duplicate video elements and a play() AbortError.
    const timeoutId = setTimeout(() => {
      if (!isMounted) return;

      scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          {
            fps: 10,
            // Scale the scan box to the panel: a fixed 250px box is larger than the viewfinder on small
            // screens. No fixed aspect ratio either — some cameras reject a forced 1:1 stream.
            qrbox: (w, h) => {
              const size = Math.max(120, Math.floor(Math.min(w, h) * 0.7));
              return { width: size, height: size };
            },
          },
          (decodedText) => {
            if (stoppingRef.current) return;
            stoppingRef.current = true;
            setIsStopping(true);
            const done = () => onScanRef.current(decodedText);
            if (scanner && scanner.isScanning) {
              scanner.stop().then(done).catch(done);
            } else {
              done();
            }
          },
          () => {},
        )
        .catch((err) => {
          if (!isMounted) return; // unmounting: not a real failure
          console.error("Camera start error:", err);
          setError(describeCameraError(err));
        });
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      // If React unmounts us forcibly without the button, stop the camera gracefully.
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [attempt]);

  const handleClose = () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    setIsStopping(true);
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current
        .stop()
        .then(() => onClose())
        .catch((e) => {
          console.error(e);
          onClose();
        });
    } else {
      onClose();
    }
  };

  return (
    <div className="w-full h-full min-h-[260px] flex flex-col items-center justify-center relative bg-black rounded-2xl overflow-hidden p-2">
      <div id="qr-reader" className="w-full h-full overflow-hidden flex items-center justify-center" />

      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-900/95 p-6 text-center">
          <p className="text-sm font-medium text-white max-w-xs">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setError(null);
                setAttempt((a) => a + 1);
              }}
              className="px-5 py-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-bold"
            >
              Try again
            </button>
            <button
              onClick={handleClose}
              className="px-5 py-2 rounded-full bg-white text-slate-700 text-sm font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <button
        onClick={handleClose}
        disabled={isStopping}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-white text-rose-600 border-2 border-rose-100 hover:bg-rose-50 rounded-full shadow-lg text-sm font-bold transition-all disabled:opacity-50 z-10"
      >
        {isStopping ? "Closing..." : "Close Camera"}
      </button>
    </div>
  );
}
