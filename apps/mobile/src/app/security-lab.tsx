import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { AlertTriangle, Check, Copy, DatabaseZap, RotateCcw, X } from "lucide-react-native";
import type { Receipt, VerificationResult } from "@nuproof/shared";
import { Button, Card, ErrorState, LoadingState, Money, Screen, ScreenHeader } from "@/components/ui";
import { listTransactions, resetDemo, reverseTransaction } from "@/services/transactionService";
import {
  verifyReceipt,
  verifyTamperedAmount
} from "@/services/verificationService";
import { formatMoney } from "@/utils/format";

type LabResult = { title: string; detail: string; valid: boolean; warning?: boolean };

export default function SecurityLabScreen() {
  const [receipt, setReceipt] = useState<Receipt>();
  const [result, setResult] = useState<LabResult>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const items = await listTransactions();
      setReceipt(items.find((item) => item.currentStatus === "SETTLED") ?? items[0]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Error");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function run(operation: () => Promise<LabResult>): Promise<void> {
    setLoading(true);
    setResult(undefined);
    try {
      setResult(await operation());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible ejecutar la prueba.");
    } finally {
      setLoading(false);
    }
  }

  if (error) return <ErrorState message={error} retry={() => void load()} />;
  if (!receipt) return <LoadingState />;

  const selected = receipt;
  const tamperedAmount = selected.amount === 100_000 ? 8_000_000 : selected.amount * 10;

  async function attackAmount(): Promise<LabResult> {
    const value = await verifyTamperedAmount(
      selected.receiptId,
      selected.verificationToken,
      tamperedAmount
    );
    return {
      title: value.code === "INVALID_SIGNATURE" ? "SIGNATURE / DATA MISMATCH" : value.code,
      detail: `La firma de ${formatMoney(selected.amount)} no valida ${formatMoney(tamperedAmount)}.`,
      valid: false
    };
  }

  async function attackCopiedQr(): Promise<LabResult> {
    const value = await verifyReceipt(selected.receiptId, selected.verificationToken);
    return {
      title: "REGISTRO ORIGINAL RECUPERADO",
      detail: `El QR devuelve ${formatMoney(value.transaction?.amount ?? 0)}, no el valor falso de ${formatMoney(tamperedAmount)}.`,
      valid: true
    };
  }

  async function attackUnknownId(): Promise<LabResult> {
    const value = await verifyReceipt(
      "ffffffff-ffff-4fff-8fff-ffffffffffff",
      "a".repeat(43)
    );
    return {
      title: value.code,
      detail: "El identificador inventado no revela datos internos.",
      valid: false
    };
  }

  async function reverse(): Promise<LabResult> {
    await reverseTransaction(selected.transactionId);
    const value: VerificationResult = await verifyReceipt(
      selected.receiptId,
      selected.verificationToken
    );
    await load();
    return {
      title: "AUTÉNTICO · REVERSED",
      detail: `Firma válida: ${value.signatureValid ? "sí" : "no"}. Estado actual: ${value.transaction?.status}.`,
      valid: true,
      warning: true
    };
  }

  return (
    <Screen>
      <ScreenHeader title="Security Lab" subtitle="Pruebas controladas sobre datos ficticios" />
      <View className="mb-5 rounded-lg bg-surface p-4">
        <Text className="text-xs font-bold uppercase text-muted">Comprobante base</Text>
        <View className="mt-2 flex-row items-end justify-between">
          <Money amount={selected.amount} />
          <Text className="text-sm text-muted">{selected.destinationMasked}</Text>
        </View>
      </View>

      <View className="gap-3">
        <Card>
          <Text className="text-lg font-bold text-ink">1. Modificar valor</Text>
          <View className="my-4 flex-row gap-3">
            <View className="flex-1 rounded-lg bg-success-soft p-3">
              <Text className="text-xs font-bold text-success">ORIGINAL</Text>
              <Text className="mt-1 font-bold text-ink">{formatMoney(selected.amount)}</Text>
            </View>
            <View className="flex-1 rounded-lg bg-danger-soft p-3">
              <Text className="text-xs font-bold text-danger">MANIPULADO</Text>
              <Text className="mt-1 font-bold text-ink">{formatMoney(tamperedAmount)}</Text>
            </View>
          </View>
          <Button label="Validar contenido alterado" icon={DatabaseZap} tone="secondary" loading={loading} onPress={() => void run(attackAmount)} />
        </Card>

        <Card>
          <Text className="text-lg font-bold text-ink">2. Copiar QR verdadero</Text>
          <Text className="my-3 leading-6 text-muted">
            Simula pegar el QR auténtico sobre un documento que muestra {formatMoney(tamperedAmount)}.
          </Text>
          <Button label="Consultar QR copiado" icon={Copy} tone="secondary" loading={loading} onPress={() => void run(attackCopiedQr)} />
        </Card>

        <Card>
          <Text className="text-lg font-bold text-ink">3. ID inventado</Text>
          <Text className="my-3 leading-6 text-muted">Consulta un UUID válido en formato, pero inexistente.</Text>
          <Button label="Probar identificador" icon={X} tone="secondary" loading={loading} onPress={() => void run(attackUnknownId)} />
        </Card>

        <Card>
          <Text className="text-lg font-bold text-ink">4. Reversar transacción</Text>
          <Text className="my-3 leading-6 text-muted">Conserva el snapshot firmado y cambia únicamente el estado operativo actual.</Text>
          <Button label="Reversar y verificar" icon={AlertTriangle} tone="secondary" loading={loading} onPress={() => void run(reverse)} />
        </Card>
      </View>

      {result ? (
        <View className={`mt-5 rounded-lg p-5 ${result.warning ? "bg-warning-soft" : result.valid ? "bg-success-soft" : "bg-danger-soft"}`}>
          <View className="flex-row items-center gap-2">
            {result.warning ? <AlertTriangle color="#A14F08" size={20} /> : result.valid ? <Check color="#087A55" size={20} /> : <X color="#B42318" size={20} />}
            <Text className={`flex-1 font-bold ${result.warning ? "text-warning" : result.valid ? "text-success" : "text-danger"}`}>{result.title}</Text>
          </View>
          <Text className="mt-2 leading-6 text-ink">{result.detail}</Text>
        </View>
      ) : null}

      <View className="mt-5">
        <Button
          label="Restaurar laboratorio"
          icon={RotateCcw}
          tone="secondary"
          onPress={() =>
            void run(async () => {
              const items = await resetDemo();
              setReceipt(items.find((item) => item.currentStatus === "SETTLED") ?? items[0]);
              return { title: "DEMO RESTAURADA", detail: "Fixtures recreados; claves conservadas.", valid: true };
            })
          }
        />
      </View>
    </Screen>
  );
}
