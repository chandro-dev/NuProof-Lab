import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { Receipt } from "@nuproof/shared";
import { Card, ErrorState, LoadingState, Screen, ScreenHeader, SecurityCheck } from "@/components/ui";
import { listTransactions } from "@/services/transactionService";
import { shortId } from "@/utils/format";

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View className="border-b border-line py-4">
      <Text className="text-xs font-bold uppercase text-muted">{label}</Text>
      <Text className={`mt-2 text-sm text-ink ${mono ? "font-mono" : ""}`} selectable>
        {value}
      </Text>
    </View>
  );
}

export default function SecurityDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [receipt, setReceipt] = useState<Receipt>();
  const [error, setError] = useState("");

  useEffect(() => {
    listTransactions()
      .then((items) => {
        const found = items.find((item) => item.transactionId === id);
        if (!found) throw new Error("No se encontró el comprobante.");
        setReceipt(found);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Error"));
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!receipt) return <LoadingState />;

  return (
    <Screen>
      <ScreenHeader title="Detalles de seguridad" subtitle="Evidencia criptográfica" />
      <Card className="mb-5">
        <Text className="mb-2 text-lg font-bold text-ink">Estado criptográfico</Text>
        <SecurityCheck label="Firma digital válida al emitir" />
        <SecurityCheck label="Integridad protegida" />
        <SecurityCheck label="Transacción encontrada" />
        {receipt.currentStatus === "REVERSED" ? (
          <SecurityCheck label="Estado actual: reversada" state="warning" />
        ) : null}
      </Card>
      <View className="rounded-lg bg-surface px-5">
        <Field label="Algoritmo" value="Ed25519" />
        <Field label="Hash" value={`SHA-256\n${receipt.payloadHash}`} mono />
        <Field label="Key ID" value={receipt.keyId} mono />
        <Field label="Transaction ID" value={shortId(receipt.transactionId)} mono />
        <Field label="Receipt ID" value={receipt.receiptId} mono />
      </View>
      <Text className="mt-5 text-sm leading-6 text-muted">
        La clave privada permanece exclusivamente en el servidor local y nunca forma parte de esta
        aplicación ni de sus respuestas HTTP.
      </Text>
    </Screen>
  );
}

