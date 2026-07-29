"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Braces,
  Check,
  Copy,
  DatabaseZap,
  FileQuestion,
  Fingerprint,
  Hash,
  KeyRound,
  LoaderCircle,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  X
} from "lucide-react";
import type { Transaction } from "@/src/domain/model";
import type {
  IssuedReceiptView,
  SecurityCheckId,
  SecurityCheckState,
  SecurityLabAnalysis
} from "@/src/types/contracts";
import {
  analyzeReceiptSecurity,
  createReceipt,
  createTransaction,
  reverseTransaction
} from "@/src/lib/api/client";
import { formatMoney, statusLabel } from "@/src/lib/format";
import { Button, ErrorNotice } from "./ui";

type Scenario = "baseline" | "tamper" | "copy" | "unknown" | "token" | "reverse";
type EvidenceTab = "payload" | "hash" | "signature" | "status";

const scenarioDetails = [
  {
    id: "tamper" as const,
    icon: ShieldAlert,
    title: "Monto modificado",
    description: "$250.000 se presenta como $2.500.000 sin volver a firmar.",
    expectation: "Falla hash + firma"
  },
  {
    id: "copy" as const,
    icon: Copy,
    title: "QR verdadero copiado",
    description: "El QR válido se pega sobre un comprobante con otro monto.",
    expectation: "Firma válida, datos distintos"
  },
  {
    id: "unknown" as const,
    icon: FileQuestion,
    title: "Receipt ID inventado",
    description: "Se consulta un identificador que el emisor nunca creó.",
    expectation: "Falla búsqueda"
  },
  {
    id: "token" as const,
    icon: DatabaseZap,
    title: "Token incorrecto",
    description: "El receipt existe, pero el bearer token no coincide.",
    expectation: "Falla autenticación"
  },
  {
    id: "reverse" as const,
    icon: RotateCcw,
    title: "Operación reversada",
    description: "La firma histórica sigue válida y cambia el estado actual.",
    expectation: "Firma válida + advertencia"
  }
];

const checkExplanations: Record<SecurityCheckId, string> = {
  RECEIPT_LOOKUP:
    "Confirma que el UUID corresponde a un comprobante emitido. No se usan identificadores secuenciales.",
  TOKEN:
    "Compara HMAC-SHA-256(token) contra el digest almacenado usando buffers de longitud fija.",
  CANONICALIZATION:
    "Ordena las claves y transforma el payload en bytes UTF-8 deterministas. Un mismo payload produce los mismos bytes.",
  HASH:
    "Calcula SHA-256 sobre el payload canónico y lo compara con el hash registrado al emitir.",
  PUBLIC_KEY:
    "Resuelve keyId en el registro de claves públicas para soportar rotación sin usar la clave privada.",
  SIGNATURE:
    "Ed25519 verifica que la firma fue creada por el emisor para esos bytes exactos.",
  CURRENT_STATUS:
    "Consulta la transacción mutable sin alterar el estado histórico protegido por la firma."
};

const stateStyle: Record<SecurityCheckState, string> = {
  PASS: "border-success bg-success-soft text-success",
  FAIL: "border-danger bg-danger-soft text-danger",
  WARN: "border-warning bg-warning-soft text-warning",
  SKIPPED: "border-line bg-surface text-muted"
};

const stateLabel: Record<SecurityCheckState, string> = {
  PASS: "Aprobado",
  FAIL: "Falló",
  WARN: "Advertencia",
  SKIPPED: "No ejecutado"
};

function StateIcon({ state, size = 18 }: { state: SecurityCheckState; size?: number }) {
  if (state === "PASS") return <Check size={size} />;
  if (state === "WARN") return <AlertTriangle size={size} />;
  if (state === "FAIL") return <X size={size} />;
  return <span className="block size-2 rounded-full bg-gray-400" />;
}

function ArtifactValue({ children }: { children: string }) {
  return (
    <code className="mt-2 block break-all rounded-md bg-ink p-4 font-mono text-xs leading-5 text-white">
      {children}
    </code>
  );
}

export function SecurityLab() {
  const [transaction, setTransaction] = useState<Transaction>();
  const [receipt, setReceipt] = useState<IssuedReceiptView>();
  const [scenario, setScenario] = useState<Scenario>("baseline");
  const [analysis, setAnalysis] = useState<SecurityLabAnalysis>();
  const [selectedCheck, setSelectedCheck] = useState<SecurityCheckId>("RECEIPT_LOOKUP");
  const [evidenceTab, setEvidenceTab] = useState<EvidenceTab>("payload");
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
      const trace = await analyzeReceiptSecurity(
        issued.id,
        issued.verificationToken as string
      );
      setTransaction(created);
      setReceipt(issued);
      setScenario("baseline");
      setAnalysis(trace);
      setSelectedCheck("RECEIPT_LOOKUP");
      setEvidenceTab("payload");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible preparar el escenario.");
    } finally {
      setLoading(undefined);
    }
  }

  async function run(nextScenario: Exclude<Scenario, "baseline">) {
    if (!transaction || !receipt?.verificationToken) return;
    setLoading(nextScenario);
    setError("");
    try {
      let receiptId = receipt.id;
      let token = receipt.verificationToken;
      let presentedAmount: number | undefined;
      if (nextScenario === "tamper") presentedAmount = 250_000_000;
      if (nextScenario === "unknown") {
        receiptId = "11111111-1111-4111-8111-111111111111";
      }
      if (nextScenario === "token") token = "x".repeat(43);
      if (nextScenario === "reverse") {
        const updated = await reverseTransaction(transaction.id);
        setTransaction(updated);
      }
      const trace = await analyzeReceiptSecurity(receiptId, token, presentedAmount);
      setScenario(nextScenario);
      setAnalysis(trace);
      setSelectedCheck(
        nextScenario === "tamper"
          ? "HASH"
          : nextScenario === "token"
            ? "TOKEN"
            : nextScenario === "unknown"
              ? "RECEIPT_LOOKUP"
              : nextScenario === "reverse"
                ? "CURRENT_STATUS"
                : "SIGNATURE"
      );
      setEvidenceTab(
        nextScenario === "tamper"
          ? "hash"
          : nextScenario === "reverse"
            ? "status"
            : nextScenario === "copy"
              ? "payload"
              : "signature"
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "El escenario no pudo ejecutarse.");
    } finally {
      setLoading(undefined);
    }
  }

  const activeCheck = analysis?.checks.find((check) => check.id === selectedCheck);
  const isReversed = analysis?.result === "VERIFIED_REVERSED";
  const isInvalid = analysis ? !analysis.authentic : false;

  return (
    <div className="space-y-10">
      <section className="grid gap-8 border-y border-line py-7 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-md bg-brand text-white">
              <Fingerprint size={22} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-brand">Evidencia original</p>
              <h2 className="text-xl font-bold">Comprobante firmado</h2>
            </div>
          </div>
          {receipt ? (
            <div className="mt-6">
              <p className="text-4xl font-bold">{formatMoney(receipt.amountMinor)}</p>
              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
                <div>
                  <p className="text-xs font-bold uppercase text-muted">Destino</p>
                  <p className="mt-1 font-semibold">{receipt.destinationMasked}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-muted">Estado</p>
                  <p className="mt-1 font-semibold">{statusLabel(receipt.currentStatus)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold uppercase text-muted">Key ID</p>
                  <p className="mt-1 break-all font-mono text-xs">{receipt.keyId}</p>
                </div>
              </div>
              <div className="mt-5 border-l-2 border-success pl-4">
                <p className="text-sm font-bold text-success">Ed25519 emitida</p>
                <p className="mt-1 truncate font-mono text-xs text-muted">{receipt.signature}</p>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm leading-6 text-muted">
              El laboratorio necesita emitir un comprobante real antes de analizarlo.
            </p>
          )}
          <Button
            className="mt-6 w-full"
            tone={receipt ? "secondary" : "primary"}
            icon={loading === "setup" ? LoaderCircle : ShieldCheck}
            disabled={Boolean(loading)}
            onClick={() => void setup()}
          >
            {receipt ? "Restablecer evidencia" : "Preparar laboratorio"}
          </Button>
        </div>

        <div className="min-w-0">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-muted">Vectores de prueba</p>
              <h2 className="mt-1 text-xl font-bold">Elige una alteración</h2>
            </div>
            <span className="text-xs font-semibold text-muted">Criptografía real</span>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {scenarioDetails.map(({ id, icon: Icon, title, description, expectation }) => (
              <div
                key={id}
                className={`grid gap-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center ${
                  scenario === id ? "bg-surface px-3" : ""
                }`}
              >
                <div className="flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface text-brand">
                    <Icon size={19} />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="font-bold">{title}</h3>
                      <span className="text-xs font-bold text-muted">{expectation}</span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-muted">{description}</p>
                  </div>
                </div>
                <Button
                  tone="secondary"
                  aria-label={`Ejecutar escenario: ${title}`}
                  disabled={!receipt || Boolean(loading) || (id === "reverse" && transaction?.status === "REVERSED")}
                  onClick={() => void run(id)}
                >
                  {loading === id ? "Analizando…" : "Ejecutar"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error ? <ErrorNotice>{error}</ErrorNotice> : null}

      {analysis ? (
        <>
          <section
            className={`border-l-4 p-5 ${
              isInvalid
                ? "border-danger bg-danger-soft"
                : isReversed
                  ? "border-warning bg-warning-soft"
                  : "border-success bg-success-soft"
            }`}
          >
            <div className="flex items-start gap-4">
              <span
                className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full ${
                  isInvalid
                    ? "bg-danger text-white"
                    : isReversed
                      ? "bg-warning text-white"
                      : "bg-success text-white"
                }`}
              >
                {isInvalid ? <X size={23} /> : isReversed ? <AlertTriangle size={22} /> : <Check size={23} />}
              </span>
              <div>
                <p className="text-xs font-bold uppercase text-muted">Decisión del servidor</p>
                <h2 className="mt-1 text-2xl font-bold">{analysis.result}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {scenario === "copy"
                    ? "El QR y la firma son auténticos, pero validan el registro original del emisor."
                    : isInvalid
                      ? "La cadena de confianza se detuvo. Las etapas posteriores no pueden compensar el fallo."
                      : isReversed
                        ? "La evidencia histórica conserva su validez; el estado operativo actual requiere advertencia."
                        : "Todas las etapas criptográficas y operativas aprobaron la validación."}
                </p>
              </div>
            </div>
          </section>

          {scenario === "copy" && analysis.receipt ? (
            <section className="grid border-y border-line sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
              <div className="p-5">
                <p className="text-xs font-bold uppercase text-danger">Documento presentado</p>
                <p className="mt-2 text-3xl font-bold">{formatMoney(250_000_000)}</p>
                <p className="mt-2 text-sm text-muted">Monto impreso junto al QR copiado</p>
              </div>
              <div className="flex items-center justify-center border-y border-line bg-danger-soft px-5 py-3 font-bold text-danger sm:border-x sm:border-y-0">
                <X className="mr-2" size={20} /> No coincide
              </div>
              <div className="bg-surface p-5">
                <p className="text-xs font-bold uppercase text-success">Registro del emisor</p>
                <p className="mt-2 text-3xl font-bold">
                  {formatMoney(analysis.receipt.amountMinor)}
                </p>
                <p className="mt-2 text-sm text-muted">Datos realmente protegidos por la firma</p>
              </div>
            </section>
          ) : null}

          <section>
            <div className="mb-5">
              <p className="text-xs font-bold uppercase text-brand">Cadena de confianza</p>
              <h2 className="mt-1 text-2xl font-bold">Ruta de validación</h2>
            </div>
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {analysis.checks.map((check, index) => (
                <li key={check.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedCheck(check.id)}
                    className={`h-full min-h-28 w-full border-t-4 p-3 text-left transition ${stateStyle[check.state]} ${
                      selectedCheck === check.id ? "outline outline-2 outline-brand outline-offset-2" : ""
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span className="text-xs font-bold opacity-70">0{index + 1}</span>
                      <StateIcon state={check.state} />
                    </span>
                    <span className="mt-4 block text-sm font-bold leading-5">{check.title}</span>
                    <span className="mt-1 block text-xs font-semibold">{stateLabel[check.state]}</span>
                  </button>
                </li>
              ))}
            </ol>

            {activeCheck ? (
              <div className="mt-5 grid gap-4 border-y border-line py-5 md:grid-cols-[0.7fr_1.3fr]">
                <div className="flex items-start gap-3">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${stateStyle[activeCheck.state]}`}>
                    <StateIcon state={activeCheck.state} size={17} />
                  </span>
                  <div>
                    <p className="font-bold">{activeCheck.title}</p>
                    <p className="mt-1 text-sm font-semibold text-muted">{activeCheck.summary}</p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-muted">{checkExplanations[activeCheck.id]}</p>
              </div>
            ) : null}
          </section>

          <section className="border-t-4 border-ink pt-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase text-muted">Inspector de evidencia</p>
                <h2 className="mt-1 text-2xl font-bold">Qué comparó el servidor</h2>
              </div>
              <div className="grid grid-cols-4 border border-line bg-white" role="tablist" aria-label="Evidencia">
                {[
                  ["payload", Braces, "Payload"],
                  ["hash", Hash, "Hash"],
                  ["signature", KeyRound, "Firma"],
                  ["status", Search, "Estado"]
                ].map(([id, Icon, label]) => {
                  const TabIcon = Icon as typeof Braces;
                  return (
                    <button
                      key={String(id)}
                      type="button"
                      role="tab"
                      aria-selected={evidenceTab === id}
                      onClick={() => setEvidenceTab(id as EvidenceTab)}
                      className={`flex min-h-12 items-center justify-center gap-2 border-r border-line px-3 text-sm font-bold last:border-r-0 ${
                        evidenceTab === id ? "bg-ink text-white" : "text-muted hover:bg-surface"
                      }`}
                    >
                      <TabIcon size={16} />
                      <span className="hidden sm:inline">{String(label)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {!analysis.artifacts ? (
              <div className="mt-5 border-y border-line bg-surface p-6">
                <p className="font-bold">Evidencia protegida por minimización</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  El servidor no reconstruye ni devuelve el payload cuando falla la búsqueda o el token.
                </p>
              </div>
            ) : (
              <div className="mt-5 min-h-64 min-w-0 border-y border-line py-6">
                {evidenceTab === "payload" ? (
                  <div className="grid min-w-0 gap-6 lg:grid-cols-[0.65fr_1.35fr]">
                    <div>
                      <p className="font-bold">Representación canónica</p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {analysis.artifacts.canonicalBytes} bytes UTF-8. El orden de propiedades es determinista antes de calcular hash y firma.
                      </p>
                    </div>
                    <pre className="max-h-96 min-w-0 overflow-auto rounded-md bg-ink p-5 font-mono text-xs leading-6 text-green-200">
                      {JSON.stringify(analysis.artifacts.canonicalPayload, null, 2)}
                    </pre>
                  </div>
                ) : null}

                {evidenceTab === "hash" ? (
                  <div>
                    <div className="flex items-center gap-3">
                      <Hash className={analysis.integrityValid ? "text-success" : "text-danger"} />
                      <div>
                        <p className="font-bold">SHA-256</p>
                        <p className="text-sm text-muted">
                          {analysis.integrityValid ? "Los hashes coinciden byte a byte." : "Los hashes son diferentes."}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-5 lg:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase text-muted">Hash almacenado</p>
                        <ArtifactValue>{analysis.artifacts.storedHash}</ArtifactValue>
                      </div>
                      <div>
                        <p className={`text-xs font-bold uppercase ${analysis.integrityValid ? "text-success" : "text-danger"}`}>
                          Hash calculado
                        </p>
                        <ArtifactValue>{analysis.artifacts.computedHash}</ArtifactValue>
                      </div>
                    </div>
                  </div>
                ) : null}

                {evidenceTab === "signature" ? (
                  <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
                    <div>
                      <div className={`flex size-14 items-center justify-center rounded-md ${analysis.signatureValid ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
                        <Fingerprint size={28} />
                      </div>
                      <p className="mt-4 text-xl font-bold">
                        Firma {analysis.signatureValid ? "válida" : "inválida"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        Ed25519 valida el payload con material público. La clave privada nunca participa en la verificación.
                      </p>
                    </div>
                    <dl className="divide-y divide-line border-y border-line">
                      <div className="py-3">
                        <dt className="text-xs font-bold uppercase text-muted">Algoritmo</dt>
                        <dd className="mt-1 font-mono text-sm">{analysis.artifacts.algorithm}</dd>
                      </div>
                      <div className="py-3">
                        <dt className="text-xs font-bold uppercase text-muted">Key ID</dt>
                        <dd className="mt-1 break-all font-mono text-sm">{analysis.artifacts.keyId}</dd>
                      </div>
                      <div className="py-3">
                        <dt className="text-xs font-bold uppercase text-muted">Fingerprint SHA-256 de clave pública</dt>
                        <dd className="mt-1 break-all font-mono text-xs">{analysis.artifacts.publicKeyFingerprint ?? "No resuelta"}</dd>
                      </div>
                      <div className="py-3">
                        <dt className="text-xs font-bold uppercase text-muted">Firma</dt>
                        <dd className="mt-1 break-all font-mono text-xs">{analysis.artifacts.signature}</dd>
                      </div>
                    </dl>
                  </div>
                ) : null}

                {evidenceTab === "status" && analysis.receipt && analysis.transaction ? (
                  <div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="border-l-4 border-success bg-success-soft p-5">
                        <p className="text-xs font-bold uppercase text-muted">Estado firmado al emitir</p>
                        <p className="mt-3 text-2xl font-bold text-success">
                          {statusLabel(analysis.receipt.statusAtIssuance)}
                        </p>
                        <p className="mt-2 text-sm text-muted">Inmutable dentro del payload.</p>
                      </div>
                      <div className={`border-l-4 p-5 ${isReversed ? "border-warning bg-warning-soft" : "border-success bg-success-soft"}`}>
                        <p className="text-xs font-bold uppercase text-muted">Estado operativo actual</p>
                        <p className={`mt-3 text-2xl font-bold ${isReversed ? "text-warning" : "text-success"}`}>
                          {statusLabel(analysis.transaction.currentStatus)}
                        </p>
                        <p className="mt-2 text-sm text-muted">Consultado en la transacción mutable.</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <p className="text-center font-mono text-xs text-muted">
            Verification ID: {analysis.verificationId}
          </p>
        </>
      ) : null}
    </div>
  );
}
