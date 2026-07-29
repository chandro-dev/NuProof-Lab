import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui";
import { SecurityLab } from "@/components/security-lab";

export const metadata: Metadata = { title: "Security Lab" };

export default function SecurityLabPage() {
  return (
    <Container className="min-h-[calc(100vh-8rem)] py-10 sm:py-14">
      <PageHeader
        eyebrow="Simulación de fraude"
        title="Security Lab"
        description="Cada escenario ejecuta la verificación real. No hay indicadores de validez simulados en la interfaz."
      />
      <SecurityLab />
    </Container>
  );
}
