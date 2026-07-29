"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, LoaderCircle, RotateCcw, ShieldX, X } from "lucide-react";
import type { VerificationResult as Result } from "@/src/types/contracts";
import { verifyReceipt } from "@/src/lib/api/client";
import { formatDate, formatMoney, statusLabel } from "@/src/lib/format";
import { useFragmentToken } from "@/src/lib/use-fragment-token";
import { ErrorNotice } from "./ui";

export function VerificationResult({
  receiptId
}: {
  receiptId: string;
}) {
  const token = useFragmentToken();
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    verifyReceipt(receiptId, token)
      .then(setResult)
      .catch(async (caught: unknown) => {
        const possible = caught as { status?: number; code?: string };
        if (possible.status && [403, 404, 422].includes(possible.status)) {
          setResult({
            result:
              possible.code === "RECEIPT_NOT_FOUND"
                ? "NOT_FOUND"
                : possible.code === "INVALID_VERIFICATION_TOKEN"
                  ? "INVALID_VERIFICATION_TOKEN"
                  : "INVALID_SIGNATURE",
            authentic: false,
            signatureValid: false,
            integrityValid: false,
            verificationId: "No disponible"
          });
          return;
        }
        setError("La API de verificación no está disponible temporalmente.");
      });
  }, [receiptId, token]);

  if (token === undefined) {
    return (
      <div className="flex min-h-80 items-center justify-center gap-3 text-muted">
        <LoaderCircle className="animate-spin text-brand" /> Cargando código de verificación…
      </div>
    );
  }
  if (token === null) return <ErrorNotice>Falta el token de verificación.</ErrorNotice>;
  if (error) return <ErrorNotice>{error}</ErrorNotice>;
  if (!result) {
    return (
      <div className="flex min-h-80 items-center justify-center gap-3 text-muted">
        <LoaderCircle className="animate-spin text-brand" /> Validando firma e integridad…
      </div>
    );
  }

  const reversed = result.result === "VERIFIED_REVERSED";
  const valid = result.authentic;
  const Icon = valid ? (reversed ? AlertTriangle : Check) : result.result === "NOT_FOUND" ? ShieldX : X;
  const theme = valid
    ? reversed
      ? "border-warning bg-warning-soft text-warning"
      : "border-success bg-success-soft text-success"
    : "border-danger bg-danger-soft text-danger";
  const title = valid
    ? "COMPROBANTE AUTÉNTICO"
    : result.result === "NOT_FOUND"
      ? "COMPROBANTE NO ENCONTRADO"
      : result.result === "INVALID_SIGNATURE"
        ? "INTEGRIDAD COMPROMETIDA"
        : "NO SE PUDO VERIFICAR";

  return (
    <div>
      <section className={`border-t-4 p-6 text-center sm:p-10 ${theme}`}>
        <Icon className="mx-auto" size={48} strokeWidth={2.2} />
        <h1 className="mt-5 text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl leading-7">
          {valid
            ? reversed
              ? "La firma es válida, pero la operación fue reversada después de emitir el comprobante."
              : "La firma digital, la integridad y el registro del emisor fueron validados."
            : "El comprobante presentado no pudo validarse. No lo utilices como confirmación de pago."}
        </p>
      </section>

      {result.receipt && result.transaction ? (
        <section className="grid border-x border-b border-line md:grid-cols-2">
          <div className="p-6 sm:p-8">
            <p className="text-sm font-bold uppercase text-muted">Datos firmados</p>
            <p className="mt-3 text-4xl font-bold">{formatMoney(result.receipt.amountMinor)}</p>
            <dl className="mt-6 space-y-4">
              <div>
                <dt className="text-xs font-bold uppercase text-muted">Destino</dt>
                <dd className="mt-1 text-lg">{result.receipt.destinationMasked}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-muted">Fecha de emisión</dt>
                <dd className="mt-1">{formatDate(result.receipt.issuedAt)}</dd>
              </div>
            </dl>
          </div>
          <div className="border-t border-line bg-surface p-6 sm:p-8 md:border-l md:border-t-0">
            <p className="text-sm font-bold uppercase text-muted">Estado operativo</p>
            <dl className="mt-5 space-y-5">
              <div>
                <dt className="text-xs font-bold uppercase text-muted">Estado al emitir</dt>
                <dd className="mt-1 text-lg font-bold text-success">
                  {statusLabel(result.receipt.statusAtIssuance)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-muted">Estado actual</dt>
                <dd className={`mt-1 text-lg font-bold ${reversed ? "text-warning" : "text-success"}`}>
                  {statusLabel(result.transaction.currentStatus)}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      ) : null}

      <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-line pt-5 sm:flex-row">
        <p className="font-mono text-xs text-muted">Verification ID: {result.verificationId}</p>
        <Link href="/verify" className="inline-flex items-center gap-2 font-bold text-brand">
          <RotateCcw size={17} /> Verificar otro
        </Link>
      </div>
    </div>
  );
}
