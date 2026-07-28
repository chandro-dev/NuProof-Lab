import { Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import type { QrPayload } from "@nuproof/shared";
import { encodeQrPayload } from "@/services/qrService";

export function ReceiptQr({ payload }: { payload: QrPayload }) {
  return (
    <View className="items-center rounded-lg bg-surface px-4 py-6">
      <View className="rounded-lg bg-white p-4">
        <QRCode
          value={encodeQrPayload(payload)}
          size={220}
          color="#17151C"
          backgroundColor="#FFFFFF"
        />
      </View>
      <Text className="mt-4 text-center text-sm font-semibold text-ink">Escanea para verificar</Text>
      <Text className="mt-1 text-center text-xs leading-5 text-muted">
        Incluye un snapshot enmascarado y su firma para validación sin conexión.
      </Text>
    </View>
  );
}
