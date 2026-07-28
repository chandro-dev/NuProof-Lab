import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertTriangle, Check, ScanLine, X } from "lucide-react-native";
import type { QrPayloadV2, VerificationResult } from "@nuproof/shared";
import {
  Button,
  ErrorState,
  LoadingState,
  Money,
  Screen,
  ScreenHeader,
  SecurityCheck
} from "@/components/ui";
import { verifyReceipt } from "@/services/verificationService";
import { verifyPortableProofWithStatus } from "@/services/portableVerificationService";
import { parseQrPayload } from "@/services/qrService";
import { saveVerification } from "@/services/historyService";
import { formatDate } from "@/utils/format";

export default function VerificationResultScreen() {
  const { receiptId, token, proof } = useLocalSearchParams<{
    receiptId?: string;
    token?: string;
    proof?: string;
  }>();
  const router = useRouter();
  const [result, setResult] = useState<VerificationResult>();
  const [verificationError, setVerificationError] = useState("");
  const hasPortableProof = Boolean(proof);
  const hasLegacyProof = Boolean(receiptId && token);
  const missingParams = !hasPortableProof && !hasLegacyProof;

  useEffect(() => {
    if (missingParams) return;
    let active = true;

    async function runVerification(): Promise<void> {
      try {
        let value: VerificationResult;
        let historyReceiptId: string;

        if (proof) {
          const parsed = parseQrPayload(proof);
          if (parsed.version !== 2) throw new Error("INVALID_QR");
          value = await verifyPortableProofWithStatus(parsed as QrPayloadV2);
          historyReceiptId = parsed.payload.receiptId;
        } else {
          value = await verifyReceipt(receiptId as string, token as string);
          historyReceiptId = receiptId as string;
        }

        if (!active) return;
        setResult(value);
        await saveVerification(value, historyReceiptId);
      } catch (caught) {
        if (!active) return;
        setVerificationError(
          caught instanceof Error && caught.message !== "INVALID_QR"
            ? caught.message
            : "El QR no contiene una prueba válida."
        );
      }
    }

    void runVerification();
    return () => {
      active = false;
    };
  }, [missingParams, proof, receiptId, token]);

  if (missingParams) return <ErrorState message="El QR no contiene la información requerida." />;
  if (verificationError) return <ErrorState message={verificationError} />;
  if (!result) return <LoadingState label="Validando firma e integridad…" />;

  const valid = result.code === "VERIFIED";
  const currentStatusAvailable = result.currentStatusAvailable !== false;
  const reversed =
    valid && currentStatusAvailable && result.transaction?.status === "REVERSED";
  const portableOnly = valid && !currentStatusAvailable;
  const Icon = valid ? (reversed ? AlertTriangle : Check) : X;
  const color = valid ? (reversed ? "#A14F08" : "#087A55") : "#B42318";
  const soft = valid
    ? reversed
      ? "bg-warning-soft"
      : "bg-success-soft"
    : "bg-danger-soft";

  const title = valid
    ? "COMPROBANTE AUTÉNTICO"
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
              ? "La firma es válida, pero la transferencia fue reversada posteriormente."
              : portableOnly
                ? "La firma digital y el contenido del QR son válidos. No fue posible consultar el estado operativo actual."
                : "Este comprobante fue generado por NuProof Lab y su firma digital es válida."
            : result.code === "NOT_FOUND"
              ? "NuProof Lab no reconoce este identificador de comprobante."
              : "No utilices este documento como confirmación de pago."}
        </Text>
      </View>

      {result.transaction ? (
        <View
          className={`my-7 rounded-lg p-5 ${reversed ? "bg-warning-soft" : "bg-surface"}`}
        >
          <Money amount={result.transaction.amount} large />
          <Text className="mt-5 text-xs font-bold uppercase text-muted">Destino</Text>
          <Text className="mt-1 text-base text-ink">
            {result.transaction.destinationMasked}
          </Text>
          <Text className="mt-4 text-xs font-bold uppercase text-muted">Fecha</Text>
          <Text className="mt-1 text-base text-ink">
            {formatDate(result.transaction.timestamp)}
          </Text>
          <Text className="mt-4 text-xs font-bold uppercase text-muted">
            {currentStatusAvailable ? "Estado actual" : "Estado al emitir"}
          </Text>
          <Text
            className={`mt-1 text-lg font-bold ${
              reversed ? "text-warning" : "text-success"
            }`}
          >
            {reversed ? "TRANSFERENCIA REVERSADA" : "COMPLETADA"}
          </Text>
        </View>
      ) : null}

      <View className="my-6 border-y border-line py-3">
        <SecurityCheck label="Firma válida" state={valid ? "ok" : "error"} />
        <SecurityCheck label="Datos íntegros" state={valid ? "ok" : "error"} />
        <SecurityCheck
          label={
            currentStatusAvailable
              ? "Estado actual consultado"
              : "Estado actual no disponible"
          }
          state={valid ? (currentStatusAvailable ? "ok" : "warning") : "error"}
        />
      </View>
      <Text className="mb-6 text-center font-mono text-xs text-muted">
        Verification ID: {result.verificationId}
      </Text>
      <Button label="Escanear otro" icon={ScanLine} onPress={() => router.replace("/scan")} />
    </Screen>
  );
}
