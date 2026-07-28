import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { AlertTriangle, Check, X } from "lucide-react-native";
import type { VerificationHistoryEntry } from "@/types";
import { Screen, ScreenHeader } from "@/components/ui";
import { getHistory } from "@/services/historyService";
import { formatDate } from "@/utils/format";

export default function HistoryScreen() {
  const [entries, setEntries] = useState<VerificationHistoryEntry[]>([]);
  useFocusEffect(
    useCallback(() => {
      void getHistory().then(setEntries);
    }, [])
  );

  return (
    <Screen>
      <ScreenHeader title="Verificaciones recientes" subtitle="Guardadas solo en este dispositivo" />
      {entries.length === 0 ? (
        <View className="mt-20 items-center">
          <Text className="text-lg font-bold text-ink">Aún no hay verificaciones</Text>
          <Text className="mt-2 text-center text-muted">Escanea un QR para crear el primer registro.</Text>
        </View>
      ) : (
        entries.map((entry) => {
          const Icon = entry.code === "VERIFIED" ? Check : entry.code === "REVERSED" ? AlertTriangle : X;
          const color = entry.code === "VERIFIED" ? "#087A55" : entry.code === "REVERSED" ? "#A14F08" : "#B42318";
          return (
            <View key={entry.id} className="mb-3 flex-row items-center gap-4 rounded-lg border border-line p-4">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-surface">
                <Icon color={color} size={20} />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-ink">
                  {entry.code === "VERIFIED" ? "Verified" : entry.code === "REVERSED" ? "Reversed" : "Invalid"}
                </Text>
                <Text className="mt-1 font-mono text-xs text-muted">{entry.receiptId}</Text>
              </View>
              <Text className="text-xs text-muted">{formatDate(entry.timestamp)}</Text>
            </View>
          );
        })
      )}
      <Text className="mt-6 text-sm leading-6 text-muted">
        El historial no almacena importes, nombres, tokens ni cuentas.
      </Text>
    </Screen>
  );
}

