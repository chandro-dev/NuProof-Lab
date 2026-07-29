import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui";
import { VerifyEntry } from "@/components/verify-entry";

export const metadata: Metadata = { title: "Verificar comprobante" };

export default function VerifyPage() {
  return (
    <Container className="min-h-[calc(100vh-8rem)] py-10 sm:py-14">
      <PageHeader
        eyebrow="Verificador público"
        title="Verificar comprobante"
        description="Escanea el QR o introduce el código. No confíes únicamente en la imagen presentada."
      />
      <VerifyEntry />
    </Container>
  );
}
