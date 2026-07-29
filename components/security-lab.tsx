"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  DatabaseZap,
  FileQuestion,
  LoaderCircle,
  RotateCcw,
  ShieldAlert,
  X
} from "lucide-react";
import type { Transaction } from "@/src/domain/model";
import type { IssuedReceiptView, VerificationResult } from "@/src/types/contracts";
import {
  createReceipt,
  createTransaction,
  reverseTransaction,
  verifyReceipt,
  verifyTamperedAmount
} from "@/src/lib/api/client";
import { formatMoney } from "@/src/lib/format";
import { Button, ErrorNotice } from "./ui";

type Scenario = "tamper" | "copy" | "unknown" | "token" | "reverse";

interface Finding {
  scenario: Scenario;
  result: VerificationResult;
  presentedAmount?: number;
}

const scenarioDetails = [
  {
    id: "tamper" as const,
    icon: ShieldAlert,
    title: "Dato protegido modificado",
    description: "$250.000 se presenta como $2.500.000 sin volver a firmar."
  },
  {
    id: "copy" as const,
    icon: Copy,
    title: "QR verdadero copiado",
    description: "Un QR legítimo se pega sobre un documento con otro monto."
  },
  {
    id: "unknown" as const,
    icon: FileQuestion,
    title: "Receipt ID inventado",
    description: "Se consulta un identificador UUID que el emisor nunca creó."
  },
  {
    id: "token" as const,
    icon: DatabaseZap,
    title: "Token incorrecto",
    description: "El receipt existe, pero el bearer token no coincide."
  },
  {
    id: "reverse" as const,
    icon: RotateCcw,
    title: "Transacción reversada",
    description: "La firma histórica sigue válida y cambia el estado actual."
  }
];

export function SecurityLab() {
  const [transaction, setTransaction] = useState<Transaction>();
  const [receipt, setReceipt] = useState<IssuedReceiptView>();
  const [finding, setFinding] = useState<Finding>();
  const [loading, setLoading] = useState<Scenario | "setup">();
  const [error, setError] = useState("");

  async function setup() {
    setLoading("setup");
    setError("");
    try {
      const created = await createTransaction({
        amountMinor: 25_000_000,
        currency: "COP",
        recipientAlias: "Laura Gómez",
        destinationMasked: "****5832",
        reference: "Prueba Security Lab"
      });
      const issued = await createReceipt(created.id);
      setTransaction(created);
      setReceipt(issued);
      setFinding(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible preparar el escenario.");
    } finally {
      setLoading(undefined);
    }
  }

  async function run(scenario: Scenario) {
    if (!transaction || !receipt?.verificationToken) return;
    setLoading(scenario);
    setError("");
    try {
      const input = { receiptId: receipt.id, token: receipt.verificationToken };
      let result: VerificationResult;
      if (scenario === "tamper") {
        result = await verifyTamperedAmount(input.receiptId, input.token, 250_000_000);
      } else if (scenario === "copy") {
        result = await verifyReceipt(input.receiptId, input.token);
      } else if (scenario === "unknown") {
        result = await verifyReceipt("11111111-1111-4111-8111-111111111111", input.token);
      } else if (scenario === "token") {
        result = await verifyReceipt(input.receiptId, "x".repeat(43));
      } else {
        await reverseTransaction(transaction.id);
        result = await verifyReceipt(input.receiptId, input.token);
      }
      setFinding({
        scenario,
        result,
        ...(scenario === "tamper" || scenario === "copy"
          ? { presentedAmount: 250_000_000 }
          : {})
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "El escenario no pudo ejecutarse.");
    } finally {
      setLoading(undefined);
    }
  }

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="border-t-4 border-ink bg-surface p-6">
          <p className="text-xs font-bold uppercase text-muted">Comprobante base</p>
          {receipt ? (
            <>
              <p className="mt-4 text-4xl font-bold">{formatMoney(receipt.amountMinor)}</p>
              <p className="mt-4 font-semibold">{receipt.recipientAlias}</p>
              <p className="mt-1 text-muted">{receipt.destinationMasked}</p>
              <div className="mt-5 flex items-center gap-2 text-sm font-bold text-success">
                <Check size={18} /> Firma Ed25519 emitida
              </div>
              <p className="mt-4 break-all font-mono text-xs text-muted">{receipt.id}</p>
            </>
          ) : (
            <p className="mt-4 text-sm leading-6 text-muted">
              Crea una transacción real y emite su comprobante antes de ejecutar ataques.
            </p>
          )}
          <Button
            className="mt-6 w-full"
            tone={receipt ? "secondary" : "primary"}
            icon={loading === "setup" ? LoaderCircle : ShieldAlert}
            disabled={Boolean(loading)}
            onClick={() => void setup()}
          >
            {receipt ? "Crear otro comprobante" : "Preparar laboratorio"}
          </Button>
        </section>

        <section className="divide-y divide-line border-y border-line">
          {scenarioDetails.map(({ id, icon: Icon, title, description }) => (
            <div key={id} className="grid gap-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface text-brand">
                  <Icon size={19} />
                </span>
                <div>
                  <h2 className="font-bold">{title}</h2>
                  <p className="mt-1 text-sm leading-5 text-muted">{description}</p>
                </div>
              </div>
              <Button
                tone="secondary"
                disabled={!receipt || Boolean(loading)}
                onClick={() => void run(id)}
              >
                {loading === id ? "Ejecutando…" : "Ejecutar"}
              </Button>
            </div>
          ))}
        </section>
      </div>

      {error ? <div className="mt-6"><ErrorNotice>{error}</ErrorNotice></div> : null}

      {finding ? (
        <section className="mt-8 border-t-4 border-ink bg-white">
          <div
            className={`p-6 ${
              finding.result.authentic
                ? finding.result.result === "VERIFIED_REVERSED"
                  ? "bg-warning-soft"
                  : "bg-success-soft"
                : "bg-danger-soft"
            }`}
          >
            <div className="flex items-center gap-3">
              {finding.result.authentic ? (
                finding.result.result === "VERIFIED_REVERSED" ? (
                  <AlertTriangle className="text-warning" size={26} />
                ) : (
                  <Check className="text-success" size={26} />
                )
              ) : (
                <X className="text-danger" size={26} />
              )}
              <div>
                <p className="text-xs font-bold uppercase text-muted">Resultado real de la API</p>
                <h2 className="mt-1 text-2xl font-bold">{finding.result.result}</h2>
              </div>
            </div>
          </div>

          {finding.scenario === "copy" && finding.result.receipt ? (
            <div className="grid border-x border-b border-line sm:grid-cols-2">
              <div className="p-6">
                <p className="text-xs font-bold uppercase text-danger">Datos presentados</p>
                <p className="mt-3 text-3xl font-bold">
                  {formatMoney(finding.presentedAmount!)}
                </p>
              </div>
              <div className="border-t border-line bg-surface p-6 sm:border-l sm:border-t-0">
                <p className="text-xs font-bold uppercase text-success">Datos del emisor</p>
                <p className="mt-3 text-3xl font-bold">
                  {formatMoney(finding.result.receipt.amountMinor)}
                </p>
                <p className="mt-3 font-bold text-danger">NO COINCIDEN</p>
              </div>
            </div>
          ) : null}

          {finding.result.result === "VERIFIED_REVERSED" && finding.result.receipt ? (
            <div className="grid border-x border-b border-line p-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase text-muted">Estado al emitir</p>
                <p className="mt-2 text-xl font-bold text-success">
                  {finding.result.receipt.statusAtIssuance}
                </p>
              </div>
              <div className="mt-5 sm:mt-0">
                <p className="text-xs font-bold uppercase text-muted">Estado actual</p>
                <p className="mt-2 text-xl font-bold text-warning">
                  {finding.result.transaction?.currentStatus}
                </p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
