import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { Container, PageHeader } from "@/components/ui";
import { IssuerSimulator } from "@/components/issuer-simulator";

export const metadata: Metadata = { title: "Issuer Simulator" };

export default function IssuerPage() {
  return (
    <Container className="min-h-[calc(100vh-8rem)] py-10 sm:py-14">
      <PageHeader
        eyebrow="Solo demostración"
        title="Issuer Simulator"
        description="Representa el sistema interno de una entidad emisora. En producción requiere identidad, roles y controles de red."
      />
      <div className="mb-8 flex gap-3 border-l-4 border-warning bg-warning-soft p-4 text-warning">
        <AlertTriangle className="mt-0.5 shrink-0" size={20} />
        <p className="text-sm leading-6">
          Operaciones ficticias. Este panel no forma parte del verificador público.
        </p>
      </div>
      <IssuerSimulator />
    </Container>
  );
}
