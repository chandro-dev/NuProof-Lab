import AsyncStorage from "@react-native-async-storage/async-storage";
import type { VerificationResult } from "@nuproof/shared";
import type { VerificationHistoryEntry } from "@/types";

const KEY = "nuproof.verification-history.v1";
const MAX_ENTRIES = 20;

export async function getHistory(): Promise<VerificationHistoryEntry[]> {
  const stored = await AsyncStorage.getItem(KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as VerificationHistoryEntry[];
  } catch {
    return [];
  }
}

export async function saveVerification(
  result: VerificationResult,
  receiptId: string
): Promise<void> {
  const existing = await getHistory();
  const code =
    result.code === "VERIFIED"
      ? result.transaction?.status === "REVERSED"
        ? "REVERSED"
        : "VERIFIED"
      : "INVALID";
  const entry: VerificationHistoryEntry = {
    id: `${Date.now()}-${receiptId}`,
    code,
    receiptId: `${receiptId.slice(0, 8)}…`,
    timestamp: new Date().toISOString()
  };
  await AsyncStorage.setItem(KEY, JSON.stringify([entry, ...existing].slice(0, MAX_ENTRIES)));
}

