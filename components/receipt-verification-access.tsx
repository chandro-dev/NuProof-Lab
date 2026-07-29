"use client";

import Link from "next/link";
import { useFragmentToken } from "@/src/lib/use-fragment-token";
import { ReceiptQr } from "./receipt-qr";

export function ReceiptVerificationAccess({
  receiptId,
  appUrl
}: {
  receiptId: string;
  appUrl: string;
}) {
  const token = useFragmentToken();
  if (token === undefined) {
    return <div className="size-[280px] animate-pulse bg-white" aria-label="Cargando QR" />;
  }
  if (token === null) {
    return (
      <p className="text-sm leading-6 text-warning">
        El token solo se entrega al emitir. Crea otra demostración para mostrar un QR.
      </p>
    );
  }
  const fragment = `token=${encodeURIComponent(token)}`;
  const verificationUrl = `${appUrl}/verify/${receiptId}#${fragment}`;
  return (
    <>
      <ReceiptQr value={verificationUrl} />
      <p className="mt-3 text-sm text-muted">Escanea para verificar este comprobante.</p>
      <Link
        href={`/verify/${receiptId}#${fragment}`}
        className="mt-5 flex min-h-12 w-full items-center justify-center rounded-md bg-brand px-5 font-bold text-white"
      >
        Verificar ahora
      </Link>
    </>
  );
}
