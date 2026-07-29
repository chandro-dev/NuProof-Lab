import type { Metadata } from "next";
import { Check, KeyRound } from "lucide-react";
import { Container, PageHeader } from "@/components/ui";
import { getContainer } from "@/src/infrastructure/container";

export const metadata: Metadata = { title: "Estado criptográfico" };
export const dynamic = "force-dynamic";

export default async function SecurityDetailsPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const receipt = await getContainer().receipts.getById((await params).id);
  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <PageHeader eyebrow="Información pública" title="Estado criptográfico" />
      <div className="grid gap-3 sm:grid-cols-2">
        {["Firma digital emitida", "Hash de integridad registrado"].map((label) => (
          <div key={label} className="flex items-center gap-3 border border-line p-4">
            <Check className="text-success" size={20} />
            <span className="font-semibold">{label}</span>
          </div>
        ))}
      </div>
      <dl className="mt-8 divide-y divide-line border-y border-line">
        {[
          ["Algoritmo", "Ed25519"],
          ["Hash", `SHA-256 · ${receipt.payloadHash}`],
          ["Key ID", receipt.keyId],
          ["Receipt ID", receipt.id],
          ["Transaction ID", receipt.transactionId]
        ].map(([label, value]) => (
          <div key={label} className="grid gap-1 py-4 sm:grid-cols-[160px_1fr]">
            <dt className="text-sm font-bold text-muted">{label}</dt>
            <dd className="break-all font-mono text-sm">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex gap-3 bg-surface p-5">
        <KeyRound className="shrink-0 text-brand" />
        <p className="text-sm leading-6 text-muted">
          La clave privada nunca se incluye en esta página, en el QR ni en una respuesta HTTP.
          El keyId permite resolver claves públicas históricas durante una rotación.
        </p>
      </div>
    </Container>
  );
}
