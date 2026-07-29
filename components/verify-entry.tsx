"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QrScanner from "qr-scanner";
import { Camera, CameraOff, ClipboardPaste, ScanLine } from "lucide-react";
import { Button, ErrorNotice, Field } from "./ui";

function parseVerificationValue(value: string): { receiptId: string; token: string } {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed, window.location.origin);
    const match = url.pathname.match(/^\/verify\/([0-9a-f-]{36})$/i);
    const token = new URLSearchParams(url.hash.slice(1)).get("token");
    if (match?.[1] && token) return { receiptId: match[1], token };
  } catch {
    // The compact fallback below handles non-URL input.
  }
  const compact = trimmed.match(/^([0-9a-f-]{36})[.:]([A-Za-z0-9_-]{32,8192})$/i);
  if (compact?.[1] && compact[2]) return { receiptId: compact[1], token: compact[2] };
  throw new Error("El código no pertenece a NuProof Lab.");
}

export function VerifyEntry({ startCamera = false }: { startCamera?: boolean }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [code, setCode] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState("");

  function openValue(value: string) {
    try {
      const parsed = parseVerificationValue(value);
      stopCamera();
      router.push(`/verify/${parsed.receiptId}#token=${encodeURIComponent(parsed.token)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Código inválido.");
    }
  }

  async function startScanner() {
    setError("");
    const video = videoRef.current;
    if (!video) return;
    try {
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) throw new Error("No hay una cámara disponible en este dispositivo.");
      const scanner = new QrScanner(
        video,
        (result) => openValue(result.data),
        {
          preferredCamera: "environment",
          highlightScanRegion: true,
          highlightCodeOutline: true,
          returnDetailedScanResult: true
        }
      );
      scannerRef.current = scanner;
      await scanner.start();
      setCameraActive(true);
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message.includes("Permission")
          ? "El navegador rechazó el permiso de cámara."
          : caught instanceof Error
            ? caught.message
            : "No fue posible iniciar la cámara."
      );
    }
  }

  function stopCamera() {
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setCameraActive(false);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="border-t-2 border-brand pt-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Escanear QR</h2>
            <p className="mt-1 text-sm text-muted">Usa la cámara trasera de tu teléfono.</p>
          </div>
          <Camera className="text-brand" aria-hidden />
        </div>
        <div className="relative mt-5 aspect-square max-h-[480px] overflow-hidden rounded-md bg-ink">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
            aria-label="Vista de cámara para escanear QR"
          />
          {!cameraActive ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center text-white">
              <CameraOff size={32} />
              <p className="max-w-xs text-sm text-gray-300">La cámara está detenida.</p>
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex gap-3">
          {cameraActive ? (
            <Button tone="secondary" icon={CameraOff} onClick={stopCamera} className="w-full">
              Detener cámara
            </Button>
          ) : (
            <Button icon={Camera} onClick={() => void startScanner()} className="w-full" autoFocus={startCamera}>
              Activar cámara
            </Button>
          )}
        </div>
      </section>

      <section className="border-t-2 border-ink pt-5">
        <h2 className="text-xl font-bold">Introducir código</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Pega la URL de verificación o el par receiptId y token.
        </p>
        <div className="mt-6 space-y-4">
          <Field
            label="Código de verificación"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="https://…/verify/…#token=…"
            autoComplete="off"
          />
          <Button
            icon={ClipboardPaste}
            className="w-full"
            disabled={!code.trim()}
            onClick={() => openValue(code)}
          >
            Verificar código
          </Button>
        </div>
        <div className="mt-8 border-t border-line pt-5">
          <div className="flex gap-3">
            <ScanLine className="mt-0.5 shrink-0 text-success" size={20} />
            <p className="text-sm leading-6 text-muted">
              El QR contiene la evidencia firmada. La API valida su estructura, hash y firma
              sin consultar una base de datos.
            </p>
          </div>
        </div>
      </section>
      {error ? <div className="lg:col-span-2"><ErrorNotice>{error}</ErrorNotice></div> : null}
    </div>
  );
}
