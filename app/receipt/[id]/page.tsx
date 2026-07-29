import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { StatelessReceiptView } from "@/components/stateless-receipt-view";
import { getCanonicalAppUrl } from "@/src/lib/app-url";

export const metadata: Metadata = {
  title: "Comprobante",
  referrer: "no-referrer",
  robots: { index: false, follow: false }
};

export default async function ReceiptPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const appUrl = getCanonicalAppUrl();

  return (
    <Container className="max-w-4xl py-10 sm:py-14">
      <StatelessReceiptView receiptId={id} appUrl={appUrl} />
    </Container>
  );
}
