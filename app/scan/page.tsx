import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui";
import { VerifyEntry } from "@/components/verify-entry";

export const metadata: Metadata = { title: "Escanear QR" };

export default function ScanPage() {
  return (
    <Container className="min-h-[calc(100vh-8rem)] py-10 sm:py-14">
      <PageHeader
        eyebrow="Cámara"
        title="Escanear QR"
        description="El video se procesa en tu navegador y no se almacena."
      />
      <VerifyEntry startCamera />
    </Container>
  );
}
