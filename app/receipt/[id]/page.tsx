import type { Metadata } from "next";
import Link from "next/link";
import { Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { Container, StatusPill } from "@/components/ui";
import { ReceiptVerificationAccess } from "@/components/receipt-verification-access";
import { getContainer } from "@/src/infrastructure/container";
import { getCanonicalAppUrl } from "@/src/lib/app-url";
import { formatDate, formatMoney } from "@/src/lib/format";

export const metadata: Metadata = {
  title: "Comprobante",
  referrer: "no-referrer",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receipt = await getContainer().receipts.getById(id);
  const appUrl = getCanonicalAppUrl();

  return (
    <Container className="max-w-4xl py-10 sm:py-14">
      <div className="border-t-4 border-success bg-success-soft p-6 text-center sm:p-8">
        <Check className="mx-auto text-success" size={42} />
        <p className="mt-4 font-bold text-success">Transferencia realizada</p>
        <h1 className="mt-3 text-4xl font-bold">{formatMoney(receipt.amountMinor)}</h1>
        <div className="mt-4"><StatusPill status={receipt.currentStatus} /></div>
      </div>

      <div className="grid border-x border-b border-line lg:grid-cols-[1fr_340px]">
        <dl className="divide-y divide-line p-6 sm:p-8">
          {[
            ["Destinatario", receipt.recipientAlias],
            ["Destino", receipt.destinationMasked],
            ["Fecha", formatDate(receipt.issuedAt)],
            ["Referencia", receipt.reference],
            ["Receipt ID", receipt.id],
            ["Transaction ID", receipt.transactionId]
          ].map(([label, value]) => (
            <div key={label} className="py-4 first:pt-0 last:pb-0">
              <dt className="text-xs font-bold uppercase text-muted">{label}</dt>
              <dd className="mt-1 break-all">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col items-center justify-center border-t border-line bg-surface p-6 text-center lg:border-l lg:border-t-0">
          <ReceiptVerificationAccess receiptId={id} appUrl={appUrl} />
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center justify-between gap-4 border-y border-line py-5 sm:flex-row">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand">
          <LockKeyhole size={17} /> Protegido mediante firma digital
        </div>
        <Link href={`/receipt/${id}/security`} className="inline-flex items-center gap-2 font-bold text-ink">
          <ShieldCheck size={18} /> Ver detalles de seguridad
        </Link>
      </div>
    </Container>
  );
}
