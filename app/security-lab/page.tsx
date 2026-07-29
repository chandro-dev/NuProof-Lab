import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui";
import { SecurityLab } from "@/components/security-lab";

export const metadata: Metadata = { title: "Security Lab" };

export default function SecurityLabPage() {
  return (
    <Container className="min-h-[calc(100vh-8rem)] py-10 sm:py-14">
      <PageHeader
        eyebrow="Criptografía aplicada"
        title="Security Lab"
        description="Inspecciona cómo registro, token, payload canónico, hash, clave pública, firma y estado construyen una decisión verificable."
      />
      <SecurityLab />
    </Container>
  );
}
