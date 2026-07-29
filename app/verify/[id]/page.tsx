import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { VerificationResult } from "@/components/verification-result";

export const metadata: Metadata = {
  title: "Resultado de verificación",
  referrer: "no-referrer",
  robots: { index: false, follow: false }
};

export default async function VerificationResultPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Container className="min-h-[calc(100vh-8rem)] max-w-4xl py-10 sm:py-14">
      <VerificationResult receiptId={id} />
    </Container>
  );
}
