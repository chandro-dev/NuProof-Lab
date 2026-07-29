"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function ReceiptQr({ value }: { value: string }) {
  const [source, setSource] = useState("");

  useEffect(() => {
    QRCode.toDataURL(value, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#17151C", light: "#FFFFFF" }
    }).then(setSource);
  }, [value]);

  return source ? (
    // A generated data URL is required because the QR represents a runtime receipt.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={source} width={280} height={280} alt="QR para verificar este comprobante" />
  ) : (
    <div className="size-[280px] animate-pulse bg-surface" aria-label="Generando QR" />
  );
}
