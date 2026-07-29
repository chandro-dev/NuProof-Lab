"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileClock,
  FilePlus2,
  LoaderCircle,
  Plus,
  RefreshCw,
  RotateCcw
} from "lucide-react";
import type { Transaction } from "@/src/domain/model";
import {
  createReceipt,
  createTransaction,
  getTransactions,
  resetDemo
} from "@/src/lib/api/client";
import { formatDate, formatMoney, statusLabel } from "@/src/lib/format";
import { Button, ErrorNotice, Field } from "./ui";

const initialForm = {
  amount: "250000",
  recipientAlias: "Laura Gómez",
  destinationMasked: "****5832",
  reference: "Pago servicio"
};

export function IssuerSimulator() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [created, setCreated] = useState<Transaction>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadTransactions() {
    try {
      setTransactions(await getTransactions());
    } catch {
      setTransactions([]);
    }
  }

  useEffect(() => {
    getTransactions().then(setTransactions).catch(() => setTransactions([]));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const major = Number(form.amount.replace(/[^\d]/g, ""));
      const amountMinor = major * 100;
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
        throw new Error("Ingresa un valor entero válido en pesos.");
      }
      const transaction = await createTransaction({
        amountMinor,
        currency: "COP",
        recipientAlias: form.recipientAlias,
        destinationMasked: form.destinationMasked.replace(/\s/g, ""),
        reference: form.reference
      });
      setCreated(transaction);
      await loadTransactions();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible crear la transferencia.");
    } finally {
      setLoading(false);
    }
  }

  async function issue() {
    if (!created) return;
    setLoading(true);
    setError("");
    try {
      const receipt = await createReceipt(created);
      router.push(
        `/receipt/${receipt.id}#token=${encodeURIComponent(receipt.verificationToken ?? "")}`
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible emitir el comprobante.");
    } finally {
      setLoading(false);
    }
  }

  async function reset() {
    setLoading(true);
    setError("");
    try {
      await resetDemo();
      setCreated(undefined);
      await loadTransactions();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible restaurar la demo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <section>
        <div className="border-t-4 border-brand bg-white pt-5">
          <h2 className="text-xl font-bold">Crear transferencia ficticia</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            El monto se representa en centavos y los datos permanecen solo durante esta sesión.
          </p>
        </div>
        <form className="mt-6 space-y-5" onSubmit={(event) => void submit(event)}>
          <Field
            label="Valor en COP"
            inputMode="numeric"
            value={form.amount}
            onChange={(event) => setForm({ ...form, amount: event.target.value })}
            required
          />
          <Field
            label="Destinatario"
            value={form.recipientAlias}
            onChange={(event) => setForm({ ...form, recipientAlias: event.target.value })}
            required
          />
          <Field
            label="Cuenta enmascarada"
            value={form.destinationMasked}
            onChange={(event) => setForm({ ...form, destinationMasked: event.target.value })}
            pattern="\*{4}\s?\d{4}"
            required
          />
          <Field
            label="Referencia"
            value={form.reference}
            onChange={(event) => setForm({ ...form, reference: event.target.value })}
            required
          />
          <Button className="w-full" icon={Plus} disabled={loading}>
            {loading ? "Procesando…" : "Crear transferencia"}
          </Button>
        </form>
        {error ? <div className="mt-4"><ErrorNotice>{error}</ErrorNotice></div> : null}
      </section>

      <section>
        {created ? (
          <div className="border-t-4 border-success bg-success-soft p-6">
            <p className="font-bold text-success">Transferencia realizada</p>
            <p className="mt-4 text-4xl font-bold">{formatMoney(created.amountMinor)}</p>
            <p className="mt-4 text-lg font-semibold">{created.recipientAlias}</p>
            <p className="mt-1 text-muted">{created.destinationMasked}</p>
            <Button
              className="mt-6 w-full"
              icon={FilePlus2}
              disabled={loading}
              onClick={() => void issue()}
            >
              Generar comprobante
            </Button>
          </div>
        ) : (
          <div className="flex min-h-56 flex-col items-center justify-center border-y border-line bg-surface p-8 text-center">
            <FilePlus2 className="text-gray-400" size={32} />
            <p className="mt-4 font-bold">Aún no hay una transacción nueva</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
              Crear la transferencia no emite automáticamente el comprobante.
            </p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-b border-line pb-3">
          <div>
            <h2 className="text-xl font-bold">Transacciones</h2>
            <p className="mt-1 text-sm text-muted">{transactions.length} registros de esta sesión</p>
          </div>
          <button
            type="button"
            title="Actualizar"
            className="flex size-10 items-center justify-center rounded-md border border-line"
            onClick={() => void loadTransactions()}
          >
            <RefreshCw size={18} />
          </button>
        </div>
        <div className="divide-y divide-line">
          {transactions.map((transaction) => (
            <article key={transaction.id} className="grid grid-cols-[1fr_auto] gap-3 py-4">
              <div className="min-w-0">
                <p className="truncate font-bold">{transaction.recipientAlias}</p>
                <p className="mt-1 text-sm text-muted">{formatDate(transaction.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatMoney(transaction.amountMinor)}</p>
                <p className="mt-1 text-xs text-muted">{statusLabel(transaction.status)}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            tone="secondary"
            icon={FileClock}
            onClick={() => router.push("/issuer/audit")}
          >
            Auditoría
          </Button>
          <Button
            type="button"
            tone="secondary"
            icon={loading ? LoaderCircle : RotateCcw}
            onClick={() => void reset()}
            disabled={loading}
          >
            Reset demo
          </Button>
        </div>
      </section>
    </div>
  );
}
