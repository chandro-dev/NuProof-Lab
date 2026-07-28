import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  type PressableProps
} from "react-native";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  X,
  type LucideIcon
} from "lucide-react-native";
import { useRouter } from "expo-router";
import type { TransactionStatus } from "@nuproof/shared";
import { formatMoney, statusLabel } from "@/utils/format";

export function Screen({
  children,
  scroll = true
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  if (!scroll) return <View className="flex-1 bg-white">{children}</View>;
  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="pb-12 pt-4"
      showsVerticalScrollIndicator={false}
    >
      <ScreenContent>{children}</ScreenContent>
    </ScrollView>
  );
}

export function ScreenContent({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        alignSelf: "center",
        maxWidth: 760,
        paddingHorizontal: 20,
        width: "100%"
      }}
    >
      {children}
    </View>
  );
}

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  return (
    <View className="mb-7 flex-row items-center gap-3">
      {router.canGoBack() ? (
        <Pressable
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-lg border border-line"
        >
          <ChevronLeft color="#17151C" size={22} />
        </Pressable>
      ) : null}
      <View className="min-w-0 flex-1">
        <Text className="text-2xl font-bold text-ink">{title}</Text>
        {subtitle ? <Text className="mt-1 text-sm text-muted">{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <View className={`rounded-lg border border-line bg-white p-5 shadow-sm ${className}`}>
      {children}
    </View>
  );
}

interface ButtonProps extends PressableProps {
  label: string;
  icon?: LucideIcon;
  tone?: "primary" | "secondary" | "danger";
  loading?: boolean;
}

export function Button({
  label,
  icon: Icon,
  tone = "primary",
  loading,
  disabled,
  ...props
}: ButtonProps) {
  const colors = {
    primary: "bg-brand",
    secondary: "border border-line bg-white",
    danger: "bg-danger"
  };
  const textColor = tone === "secondary" ? "text-ink" : "text-white";
  return (
    <Pressable
      {...props}
      disabled={disabled || loading}
      className={`h-14 flex-row items-center justify-center gap-2 rounded-lg px-5 ${colors[tone]} ${
        disabled || loading ? "opacity-50" : ""
      }`}
    >
      {loading ? (
        <ActivityIndicator color={tone === "secondary" ? "#17151C" : "#FFFFFF"} />
      ) : (
        <>
          {Icon ? <Icon color={tone === "secondary" ? "#17151C" : "#FFFFFF"} size={20} /> : null}
          <Text className={`text-base font-semibold ${textColor}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Money({ amount, large = false }: { amount: number; large?: boolean }) {
  return (
    <Text className={`${large ? "text-4xl" : "text-2xl"} font-bold text-ink`}>
      {formatMoney(amount)}
    </Text>
  );
}

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const background =
    status === "SETTLED"
      ? "bg-success-soft"
      : status === "REVERSED"
        ? "bg-warning-soft"
        : "bg-surface";
  const foreground =
    status === "SETTLED"
      ? "text-success"
      : status === "REVERSED"
        ? "text-warning"
        : "text-muted";
  return (
    <View className={`self-start rounded-full px-3 py-1 ${background}`}>
      <Text className={`text-xs font-bold ${foreground}`}>{statusLabel(status)}</Text>
    </View>
  );
}

export function SecurityCheck({
  label,
  state = "ok"
}: {
  label: string;
  state?: "ok" | "warning" | "error";
}) {
  const Icon = state === "ok" ? Check : state === "warning" ? AlertTriangle : X;
  const color = state === "ok" ? "#087A55" : state === "warning" ? "#A14F08" : "#B42318";
  return (
    <View className="flex-row items-center gap-3 py-2">
      <View className="h-7 w-7 items-center justify-center rounded-full bg-surface">
        <Icon color={color} size={16} strokeWidth={2.5} />
      </View>
      <Text className="flex-1 text-base text-ink">{label}</Text>
    </View>
  );
}

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 p-8">
      <ActivityIndicator color="#6D28D9" size="large" />
      <Text className="text-muted">{label}</Text>
    </View>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 p-8">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-danger-soft">
        <X color="#B42318" size={28} />
      </View>
      <Text className="text-center text-lg font-semibold text-ink">No se pudo continuar</Text>
      <Text className="text-center text-muted">{message}</Text>
      {retry ? <Button label="Reintentar" onPress={retry} /> : null}
    </View>
  );
}
