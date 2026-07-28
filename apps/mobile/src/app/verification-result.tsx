import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertTriangle, Check, ScanLine, X } from "lucide-react-native";
import type { VerificationResult } from "@nuproof/shared";
import { Button, ErrorState, LoadingState, Money, Screen, ScreenHeader, SecurityCheck } from "@/components/ui";
import { verifyReceipt } from "@/services/verificationService";
import { saveVerification } from "@/services/historyService";
import { formatDate } from "@/utils/format";

export default function VerificationResultScreen() {
  const { receiptId, token } = useLocalSearchParams<{ receiptId: string; token: string }>();
  const router = useRouter();
  const [result, setResult] = useState<VerificationResult>();
  const [networkError, setNetworkError] = useState("");
  const missingParams = !receiptId || !token;

  useEffect(() => {
    if (missingParams) return;
    verifyReceipt(receiptId, token)
      .then(async (value) => {
        setResult(value);
        await saveVerification(value, receiptId);
      })
      .catch((caught: unknown) =>
        setNetworkError(caught instanceof Error ? caught.message : "No fue posible verificar.")
      );
  }, [missingParams, receiptId, token]);

  if (missingParams) return <ErrorState message="El QR no contiene la información requerida." />;
  if (networkError) return <ErrorState message={networkError} />;
  if (!result) return <LoadingState label="Validando firma y registro…" />;

  const reversed = result.code === "VERIFIED" && result.transaction?.status === "REVERSED";
  const valid = result.code === "VERIFIED";
  const Icon = valid ? (reversed ? AlertTriangle : Check) : X;
  const color = valid ? (reversed ? "#A14F08" : "#087A55") : "#B42318";
  const soft = valid ? (reversed ? "bg-warning-soft" : "bg-success-soft") : "bg-danger-soft";

  const title = valid
    ? reversed
      ? "COMPROBANTE AUTÉNTICO"
      : "COMPROBANTE AUTÉNTICO"
    : result.code === "NOT_FOUND"
      ? "COMPROBANTE NO ENCONTRADO"
      : result.code === "INVALID_SIGNATURE"
        ? "INTEGRIDAD COMPROMETIDA"
        : "NO SE PUDO VERIFICAR";

  return (
    <Screen>
      <ScreenHeader title="Resultado" />
      <View className="items-center">
        <View className={`h-20 w-20 items-center justify-center rounded-full ${soft}`}>
          <Icon color={color} size={40} strokeWidth={2.5} />
        </View>
        <Text className="mt-6 text-center text-2xl font-bold text-ink">{title}</Text>
        <Text className="mt-3 max-w-sm text-center leading-6 text-muted">
          {valid
            ? reversed
              ? "La firma digital es válida. Sin embargo, la transferencia fue reversada posteriormente."
              : "Este comprobante fue generado por NuProof Lab y su firma digital es válida."
            : result.code === "NOT_FOUND"
              ? "NuProof Lab no reconoce este identificador de comprobante."
              : "No utilices este documento como confirmación de pago."}
        </Text>
      </View>

      {result.transaction ? (
        <View className={`my-7 rounded-lg p-5 ${reversed ? "bg-warning-soft" : "bg-surface"}`}>
          <Money amount={result.transaction.amount} large />
          <Text className="mt-5 text-xs font-bold uppercase text-muted">Destino</Text>
          <Text className="mt-1 text-base text-ink">{result.transaction.destinationMasked}</Text>
          <Text className="mt-4 text-xs font-bold uppercase text-muted">Fecha</Text>
          <Text className="mt-1 text-base text-ink">{formatDate(result.transaction.timestamp)}</Text>
          <Text className="mt-4 text-xs font-bold uppercase text-muted">Estado actual</Text>
          <Text className={`mt-1 text-lg font-bold ${reversed ? "text-warning" : "text-success"}`}>
            {reversed ? "TRANSFERENCIA REVERSADA" : "COMPLETADA"}
          </Text>
        </View>
      ) : null}

      <View className="my-6 border-y border-line py-3">
        <SecurityCheck label="Firma válida" state={valid ? "ok" : "error"} />
        <SecurityCheck label="Datos íntegros" state={valid ? "ok" : "error"} />
        <SecurityCheck
          label="Registro encontrado"
          state={result.code === "NOT_FOUND" ? "error" : valid ? "ok" : "error"}
        />
      </View>
      <Text className="mb-6 text-center font-mono text-xs text-muted">
        Verification ID: {result.verificationId}
      </Text>
      <Button label="Escanear otro" icon={ScanLine} onPress={() => router.replace("/scan")} />
    </Screen>
  );
}
