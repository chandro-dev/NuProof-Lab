import type { TransactionStatus } from "@/src/domain/model";

export function formatMoney(amountMinor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amountMinor / 100);
}

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Bogota"
  }).format(new Date(value));
}

export function statusLabel(status: TransactionStatus | string): string {
  return (
    {
      PENDING: "Pendiente",
      SETTLED: "Completada",
      REVERSED: "Reversada",
      CANCELLED: "Cancelada"
    }[status] ?? status
  );
}
