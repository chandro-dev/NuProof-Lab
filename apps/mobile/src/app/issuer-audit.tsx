import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import type { AuditEvent } from "@/types";
import { ErrorState, LoadingState, Screen, ScreenHeader } from "@/components/ui";
import { listAuditEvents } from "@/services/transactionService";
import { formatDate, shortId } from "@/utils/format";

export default function IssuerAuditScreen() {
  const [events, setEvents] = useState<AuditEvent[]>();
  const [error, setError] = useState("");

  useEffect(() => {
    listAuditEvents()
      .then(setEvents)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Error"));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!events) return <LoadingState />;

  return (
    <Screen>
      <ScreenHeader title="Auditoría local" subtitle="Eventos operativos sin secretos" />
      {events.map((event) => (
        <View key={event.id} className="mb-3 rounded-lg border border-line p-4">
          <Text className="font-bold text-ink">{event.eventType}</Text>
          <Text className="mt-2 text-sm text-muted">{formatDate(event.timestamp, true)}</Text>
          {event.receiptId ? (
            <Text className="mt-1 font-mono text-xs text-muted">{shortId(event.receiptId)}</Text>
          ) : null}
        </View>
      ))}
    </Screen>
  );
}

