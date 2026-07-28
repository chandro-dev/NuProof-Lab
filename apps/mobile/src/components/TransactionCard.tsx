import { Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import type { Receipt } from "@nuproof/shared";
import { Money, StatusBadge } from "./ui";
import { formatDate } from "@/utils/format";

export function TransactionCard({
  receipt,
  onPress
}: {
  receipt: Receipt;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-lg border border-line bg-white p-5 active:bg-surface"
    >
      <View className="mb-4 flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="mb-2 text-sm font-medium text-muted">Transferencia realizada</Text>
          <Money amount={receipt.amount} />
        </View>
        <ChevronRight color="#6B6673" size={20} />
      </View>
      <View className="mb-4">
        <Text className="text-base font-semibold text-ink">{receipt.recipientAlias}</Text>
        <Text className="mt-1 text-sm text-muted">{receipt.destinationMasked}</Text>
        <Text className="mt-1 text-sm text-muted">{formatDate(receipt.timestamp)}</Text>
      </View>
      <StatusBadge status={receipt.currentStatus} />
    </Pressable>
  );
}

