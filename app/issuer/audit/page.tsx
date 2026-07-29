import type { Metadata } from "next";
import { AuditLog } from "@/components/audit-log";
import { Container, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Auditoría" };

export default function AuditPage() {
  return (
    <Container className="min-h-[calc(100vh-8rem)] max-w-4xl py-10 sm:py-14">
      <PageHeader
        eyebrow="Área interna"
        title="Auditoría"
        description="Eventos operativos correlacionables. No contiene claves privadas ni verification tokens."
      />
      <AuditLog />
    </Container>
  );
}
