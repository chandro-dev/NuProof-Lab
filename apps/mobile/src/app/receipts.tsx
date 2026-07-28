import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { Receipt } from "@nuproof/shared";
import { ErrorState, LoadingState, ScreenContent, ScreenHeader } from "@/components/ui";
import { TransactionCard } from "@/components/TransactionCard";
import { listTransactions } from "@/services/transactionService";

export default function ReceiptsScreen() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      setReceipts(await listTransactions());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading) return <LoadingState label="Consultando comprobantes…" />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="pb-12 pt-4"
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}
    >
      <ScreenContent>
        <ScreenHeader title="Mis comprobantes" subtitle={`${receipts.length} registros ficticios`} />
        <View>
          {receipts.map((receipt) => (
            <TransactionCard
              key={receipt.receiptId}
              receipt={receipt}
              onPress={() =>
                router.push({ pathname: "/receipt/[id]", params: { id: receipt.transactionId } })
              }
            />
          ))}
        </View>
      </ScreenContent>
    </ScrollView>
  );
}
