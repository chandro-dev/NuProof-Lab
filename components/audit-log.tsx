"use client";

import { useEffect, useState } from "react";
import { FileClock, LoaderCircle, RefreshCw } from "lucide-react";
import type { AuditEvent } from "@/src/domain/model";
import { getAuditEvents } from "@/src/lib/api/client";
import { formatDate } from "@/src/lib/format";
import { Button, ErrorNotice } from "./ui";

export function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>();
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      setEvents(await getAuditEvents());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible cargar auditoría.");
    }
  }

  useEffect(() => {
    getAuditEvents()
      .then(setEvents)
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : "No fue posible cargar auditoría.")
      );
  }, []);

  if (error) return <ErrorNotice>{error}</ErrorNotice>;
  if (!events) {
    return (
      <div className="flex min-h-56 items-center justify-center gap-3 text-muted">
        <LoaderCircle className="animate-spin text-brand" /> Consultando eventos…
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button tone="secondary" icon={RefreshCw} onClick={() => void load()}>
          Actualizar
        </Button>
      </div>
      <div className="divide-y divide-line border-y border-line">
        {events.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-bold">No hay eventos en esta sesión</p>
            <p className="mt-2 text-sm text-muted">
              Crea un comprobante sin recargar la pestaña para ver su traza temporal.
            </p>
          </div>
        ) : null}
        {events.map((event) => (
          <article key={event.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]">
            <div className="flex min-w-0 gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface text-brand">
                <FileClock size={18} />
              </span>
              <div className="min-w-0">
                <p className="font-bold">{event.eventType}</p>
                <p className="mt-1 truncate font-mono text-xs text-muted">
                  {event.receiptId ?? event.transactionId ?? event.id}
                </p>
              </div>
            </div>
            <time className="text-sm text-muted">{formatDate(event.createdAt)}</time>
          </article>
        ))}
      </div>
    </div>
  );
}
