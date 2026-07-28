import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useFocusEffect, useRouter } from "expo-router";
import { Camera, RefreshCw } from "lucide-react-native";
import { Button, LoadingState, Screen, ScreenHeader } from "@/components/ui";
import { parseQrPayload } from "@/services/qrService";

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      setActive(true);
      setScanned(false);
      return () => setActive(false);
    }, [])
  );

  if (!permission) return <LoadingState label="Consultando permiso de cámara…" />;

  if (!permission.granted) {
    return (
      <Screen>
        <ScreenHeader title="Escanear comprobante" />
        <View className="mt-20 items-center gap-5">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-surface">
            <Camera color="#6D28D9" size={30} />
          </View>
          <Text className="text-center text-xl font-bold text-ink">Permiso de cámara requerido</Text>
          <Text className="max-w-xs text-center leading-6 text-muted">
            La cámara se usa únicamente para leer el QR. No se guardan fotos ni video.
          </Text>
          <Button label="Permitir cámara" icon={Camera} onPress={() => void requestPermission()} />
        </View>
      </Screen>
    );
  }

  function onBarcodeScanned(result: BarcodeScanningResult): void {
    if (scanned) return;
    setScanned(true);
    try {
      const payload = parseQrPayload(result.data);
      router.replace({
        pathname: "/verification-result",
        params: { receiptId: payload.receiptId, token: payload.token }
      });
    } catch {
      setError("Este código no pertenece a NuProof Lab o está corrupto.");
    }
  }

  return (
    <Screen scroll={false}>
      <View className="px-5 pt-4">
        <ScreenHeader title="Escanear comprobante" subtitle="Apunta al QR del recibo" />
      </View>
      <View className="mx-5 aspect-square overflow-hidden rounded-lg bg-ink">
        {active ? (
          <CameraView
            active={active}
            facing="back"
            className="flex-1"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
          />
        ) : null}
        <View pointerEvents="none" className="absolute inset-8 rounded-lg border-2 border-white/90" />
      </View>
      <View className="flex-1 px-5 py-6">
        {error ? (
          <View className="rounded-lg bg-danger-soft p-4">
            <Text className="text-center font-semibold text-danger">{error}</Text>
            <View className="mt-4">
              <Button
                label="Escanear otro código"
                icon={RefreshCw}
                tone="secondary"
                onPress={() => {
                  setError("");
                  setScanned(false);
                }}
              />
            </View>
          </View>
        ) : (
          <Text className="text-center leading-6 text-muted">
            La verificación se realiza contra el servidor local, no contra la imagen del
            comprobante.
          </Text>
        )}
      </View>
    </Screen>
  );
}

