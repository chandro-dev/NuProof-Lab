import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Building2,
  Camera,
  ChevronRight,
  FlaskConical,
  History,
  ReceiptText,
  ShieldCheck,
  type LucideIcon
} from "lucide-react-native";
import { Screen } from "@/components/ui";

const actions: {
  title: string;
  subtitle: string;
  route: "/scan" | "/receipts" | "/security-lab" | "/history" | "/issuer";
  icon: LucideIcon;
  primary?: boolean;
}[] = [
  {
    title: "Escanear comprobante",
    subtitle: "Verifica un QR contra el emisor",
    route: "/scan",
    icon: Camera,
    primary: true
  },
  {
    title: "Mis comprobantes",
    subtitle: "Consulta transferencias ficticias",
    route: "/receipts",
    icon: ReceiptText
  },
  {
    title: "Laboratorio de seguridad",
    subtitle: "Prueba manipulación, copia y reversión",
    route: "/security-lab",
    icon: FlaskConical
  },
  {
    title: "Verificaciones recientes",
    subtitle: "Historial local minimizado",
    route: "/history",
    icon: History
  },
  {
    title: "Issuer Simulator",
    subtitle: "Área interna, solo demostración",
    route: "/issuer",
    icon: Building2
  }
];

export default function HomeScreen() {
  const router = useRouter();
  return (
    <Screen>
      <View className="mb-9 pt-4">
        <View className="mb-5 h-12 w-12 items-center justify-center rounded-lg bg-brand">
          <ShieldCheck color="#FFFFFF" size={27} />
        </View>
        <Text className="text-4xl font-bold text-ink">NuProof Lab</Text>
        <Text className="mt-3 max-w-sm text-lg leading-7 text-muted">
          Comprobantes bancarios verificables
        </Text>
      </View>

      <View className="gap-3">
        {actions.map(({ title, subtitle, route, icon: Icon, primary }) => (
          <Pressable
            key={route}
            onPress={() => router.push(route)}
            className={`min-h-20 flex-row items-center gap-4 rounded-lg border p-4 ${
              primary ? "border-brand bg-brand" : "border-line bg-white"
            }`}
          >
            <View
              className={`h-11 w-11 items-center justify-center rounded-lg ${
                primary ? "bg-white/15" : "bg-surface"
              }`}
            >
              <Icon color={primary ? "#FFFFFF" : "#6D28D9"} size={22} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className={`text-base font-bold ${primary ? "text-white" : "text-ink"}`}>
                {title}
              </Text>
              <Text className={`mt-1 text-sm ${primary ? "text-white/80" : "text-muted"}`}>
                {subtitle}
              </Text>
            </View>
            <ChevronRight color={primary ? "#FFFFFF" : "#6B6673"} size={20} />
          </Pressable>
        ))}
      </View>

      <View className="mt-10 border-t border-line pt-5">
        <Text className="text-center text-xs font-semibold text-muted">
          Proof of Concept independiente · No afiliado a Nu
        </Text>
        <Text className="mt-1 text-center text-xs text-muted">Todos los datos son ficticios.</Text>
      </View>
    </Screen>
  );
}
