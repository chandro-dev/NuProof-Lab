import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LockKeyhole, ShieldCheck } from "lucide-react-native";
import type { Receipt } from "@nuproof/shared";
import { Button, ErrorState, LoadingState, Money, Screen, ScreenHeader, StatusBadge } from "@/components/ui";
import { ReceiptQr } from "@/components/ReceiptQr";
import { listTransactions } from "@/services/transactionService";
import { formatDate, shortId } from "@/utils/format";

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="border-b border-line py-3">
      <Text className="text-xs font-semibold uppercase text-muted">{label}</Text>
      <Text className="mt-1 text-base text-ink">{value}</Text>
    </View>
  );
}

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt>();
  const [error, setError] = useState("");

  useEffect(() => {
    listTransactions()
      .then((items) => {
        const found = items.find((item) => item.transactionId === id);
        if (!found) throw new Error("El comprobante no existe.");
        setReceipt(found);
      })
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : "No fue posible cargarlo.")
      );
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!receipt) return <LoadingState />;

  return (
    <Screen>
      <ScreenHeader title="Comprobante" subtitle="Transferencia realizada" />
      <View className="mb-6 items-center">
        <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-success-soft">
          <ShieldCheck color="#087A55" size={28} />
        </View>
        <Money amount={receipt.amount} large />
        <View className="mt-3">
          <StatusBadge status={receipt.currentStatus} />
        </View>
      </View>

      <View className="mb-6 rounded-lg border border-line px-5">
        <Detail label="Destinatario" value={receipt.recipientAlias} />
        <Detail label="Cuenta" value={receipt.destinationMasked} />
        <Detail label="Fecha" value={formatDate(receipt.timestamp, true)} />
        <Detail label="Referencia" value={receipt.reference} />
        <Detail label="ID de transacción" value={shortId(receipt.transactionId)} />
      </View>

      <ReceiptQr payload={receipt.qrPayload} />
      <View className="my-5 flex-row items-center justify-center gap-2">
        <LockKeyhole color="#6D28D9" size={16} />
        <Text className="text-sm font-semibold text-brand">Protegido mediante firma digital</Text>
      </View>
      <Button
        label="Ver detalles de seguridad"
        icon={ShieldCheck}
        tone="secondary"
        onPress={() =>
          router.push({ pathname: "/security/[id]", params: { id: receipt.transactionId } })
        }
      />
    </Screen>
  );
}

