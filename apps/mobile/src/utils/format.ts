import type { TransactionStatus } from "@nuproof/shared";

export function formatMoney(amount: number, currency = "COP"): string {
  return `$${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(amount)} ${currency}`;
}

export function formatDate(timestamp: string, long = false): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: long ? "long" : "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

export function statusLabel(status: TransactionStatus): string {
  return {
    PENDING: "PENDIENTE",
    SETTLED: "COMPLETADA",
    REVERSED: "REVERSADA",
    CANCELLED: "CANCELADA"
  }[status];
}

export function shortId(value: string): string {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

