import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { FileClock, Plus, RotateCcw } from "lucide-react-native";
import { Button, Card, Screen, ScreenHeader } from "@/components/ui";
import { createTransaction, resetDemo } from "@/services/transactionService";

const initial = {
  amount: "250000",
  recipientAlias: "Laura Gómez",
  destinationMasked: "**** 5832",
  reference: "Pago demo"
};

function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default"
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-semibold text-ink">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        className="h-13 rounded-lg border border-line bg-white px-4 text-base text-ink"
        placeholderTextColor="#8B8691"
      />
    </View>
  );
}

export default function IssuerScreen() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function create(): Promise<void> {
    setLoading(true);
    setMessage("");
    try {
      const amount = Number(form.amount);
      if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Ingresa un valor entero.");
      const receipt = await createTransaction({
        amount,
        currency: "COP",
        senderAlias: "Cuenta Demo",
        recipientAlias: form.recipientAlias,
        destinationMasked: form.destinationMasked,
        reference: form.reference,
        status: "SETTLED"
      });
      router.push({ pathname: "/receipt/[id]", params: { id: receipt.transactionId } });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "No fue posible crear la transferencia.");
    } finally {
      setLoading(false);
    }
  }

  async function reset(): Promise<void> {
    setLoading(true);
    try {
      await resetDemo();
      setMessage("Datos ficticios restaurados. Las claves no se regeneraron.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "No fue posible restaurar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Issuer Simulator" subtitle="Sistema interno · Solo demostración" />
      <View className="mb-6 rounded-lg border border-warning bg-warning-soft p-4">
        <Text className="font-bold text-warning">Área del emisor</Text>
        <Text className="mt-1 leading-5 text-warning">
          En producción estaría protegida por identidad, roles y red interna.
        </Text>
      </View>
      <Card>
        <Text className="mb-5 text-lg font-bold text-ink">Crear transferencia ficticia</Text>
        <Field
          label="Valor en COP"
          value={form.amount}
          keyboardType="number-pad"
          onChangeText={(amount) => setForm({ ...form, amount })}
        />
        <Field
          label="Destinatario"
          value={form.recipientAlias}
          onChangeText={(recipientAlias) => setForm({ ...form, recipientAlias })}
        />
        <Field
          label="Cuenta enmascarada"
          value={form.destinationMasked}
          onChangeText={(destinationMasked) => setForm({ ...form, destinationMasked })}
        />
        <Field
          label="Referencia"
          value={form.reference}
          onChangeText={(reference) => setForm({ ...form, reference })}
        />
        <Button label="Crear y firmar comprobante" icon={Plus} loading={loading} onPress={() => void create()} />
      </Card>
      {message ? (
        <Text className="mt-4 rounded-lg bg-surface p-4 text-center text-sm text-muted">{message}</Text>
      ) : null}
      <View className="mt-5 gap-3">
        <Button
          label="Consultar auditoría"
          icon={FileClock}
          tone="secondary"
          onPress={() => router.push("/issuer-audit")}
        />
        <Button
          label="Reset demo"
          icon={RotateCcw}
          tone="secondary"
          loading={loading}
          onPress={() => void reset()}
        />
      </View>
    </Screen>
  );
}

