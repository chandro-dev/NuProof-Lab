"use client";

import Link from "next/link";
import { Check, LockKeyhole, ShieldCheck, TriangleAlert } from "lucide-react";
import { decodeReceiptEnvelope } from "@/src/domain/stateless-envelope";
import { formatDate, formatMoney } from "@/src/lib/format";
import { useFragmentToken } from "@/src/lib/use-fragment-token";
import { ReceiptVerificationAccess } from "./receipt-verification-access";
import { StatusPill } from "./ui";

export function StatelessReceiptView({
  receiptId,
  appUrl
}: {
  receiptId: string;
  appUrl: string;
}) {
  const token = useFragmentToken();

  if (token === undefined) {
    return <div className="min-h-96 animate-pulse bg-surface" aria-label="Cargando comprobante" />;
  }

  if (token === null) {
    return (
      <div className="border-t-4 border-warning bg-warning-soft p-8 text-center">
        <TriangleAlert className="mx-auto text-warning" size={38} />
        <h1 className="mt-4 text-2xl font-bold">Falta la evidencia del comprobante</h1>
        <p className="mt-2 text-sm text-muted">
          Abre nuevamente el enlace completo generado por el emisor.
        </p>
      </div>
    );
  }

  let envelope;
  try {
    envelope = decodeReceiptEnvelope(token);
    if (envelope.payload.receiptId !== receiptId) throw new Error("Receipt ID mismatch");
  } catch {
    return (
      <div className="border-t-4 border-danger bg-danger-soft p-8 text-center">
        <TriangleAlert className="mx-auto text-danger" size={38} />
        <h1 className="mt-4 text-2xl font-bold">Comprobante no válido</h1>
        <p className="mt-2 text-sm text-muted">
          El enlace está incompleto o la evidencia no corresponde a este comprobante.
        </p>
      </div>
    );
  }

  const { payload, recipientAlias } = envelope;

  return (
    <>
      <div className="border-t-4 border-success bg-success-soft p-6 text-center sm:p-8">
        <Check className="mx-auto text-success" size={42} />
        <p className="mt-4 font-bold text-success">Transferencia realizada</p>
        <h1 className="mt-3 text-4xl font-bold">{formatMoney(payload.amountMinor)}</h1>
        <div className="mt-4"><StatusPill status={payload.statusAtIssuance} /></div>
      </div>

      <div className="grid border-x border-b border-line lg:grid-cols-[1fr_340px]">
        <dl className="divide-y divide-line p-6 sm:p-8">
          {[
            ["Destinatario", recipientAlias],
            ["Destino", payload.destinationMasked],
            ["Fecha", formatDate(payload.issuedAt)],
            ["Referencia", payload.reference],
            ["Receipt ID", payload.receiptId],
            ["Transaction ID", payload.transactionId]
          ].map(([label, value]) => (
            <div key={label} className="py-4 first:pt-0 last:pb-0">
              <dt className="text-xs font-bold uppercase text-muted">{label}</dt>
              <dd className="mt-1 break-all">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col items-center justify-center border-t border-line bg-surface p-6 text-center lg:border-l lg:border-t-0">
          <ReceiptVerificationAccess receiptId={receiptId} appUrl={appUrl} />
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center justify-between gap-4 border-y border-line py-5 sm:flex-row">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand">
          <LockKeyhole size={17} /> Protegido mediante firma digital
        </div>
        <Link href="/security-lab" className="inline-flex items-center gap-2 font-bold text-ink">
          <ShieldCheck size={18} /> Explorar la validación
        </Link>
      </div>
    </>
  );
}
