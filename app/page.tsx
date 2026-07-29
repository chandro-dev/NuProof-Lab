import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Braces,
  Camera,
  Database,
  FileCheck2,
  FlaskConical,
  KeyRound,
  ScanLine,
  Server
} from "lucide-react";
import { ActionLink, Container } from "@/components/ui";

const architecture = [
  { icon: ScanLine, label: "Browser", detail: "Escaneo y visualización" },
  { icon: Braces, label: "/api/v1", detail: "Contrato REST estable" },
  { icon: Server, label: "Servicios", detail: "Emisión y verificación" },
  { icon: Database, label: "PostgreSQL", detail: "Estado y auditoría" }
];

export default function HomePage() {
  return (
    <>
      <section className="relative min-h-[620px] overflow-hidden bg-ink text-white">
        <Image
          src="/verification-hero.png"
          alt="Teléfono verificando un comprobante firmado junto a su código QR"
          fill
          priority
          className="object-cover object-[62%_center]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/65" />
        <Container className="relative flex min-h-[620px] items-center py-16">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-bold uppercase text-violet-200">
              Proof of Concept FinTech
            </p>
            <h1 className="text-5xl font-bold leading-tight sm:text-7xl">NuProof Lab</h1>
            <p className="mt-5 text-2xl font-semibold">Comprueba. Verifica. Confía.</p>
            <p className="mt-4 max-w-xl text-lg leading-8 text-gray-200">
              Arquitectura backend para emitir y validar comprobantes bancarios mediante firmas
              digitales, trazabilidad y simulaciones reales de fraude.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ActionLink href="/verify" icon={ScanLine}>
                Verificar comprobante
              </ActionLink>
              <ActionLink href="/scan" icon={Camera} secondary>
                Escanear QR
              </ActionLink>
              <ActionLink href="/issuer" icon={FlaskConical} secondary>
                Explorar demo
              </ActionLink>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-line bg-white py-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase text-brand">No confíes en una imagen</p>
              <h2 className="mt-3 text-3xl font-bold">Verifica el registro del emisor</h2>
              <p className="mt-4 leading-7 text-muted">
                Una captura puede editarse y un QR puede copiarse. NuProof reconstruye el payload
                histórico, valida SHA-256 y Ed25519, y consulta por separado el estado operativo
                actual.
              </p>
              <Link href="/security-lab" className="mt-6 inline-flex items-center gap-2 font-bold text-brand">
                Abrir Security Lab <ArrowRight size={18} />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {architecture.map(({ icon: Icon, label, detail }, index) => (
                <div key={label} className="relative border-l-2 border-line py-3 pl-4">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-surface text-brand">
                    <Icon size={20} />
                  </div>
                  <p className="font-bold">{label}</p>
                  <p className="mt-1 text-sm leading-5 text-muted">{detail}</p>
                  {index < architecture.length - 1 ? (
                    <ArrowRight className="absolute -right-3 top-5 hidden text-gray-300 sm:block" size={16} />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-surface py-16">
        <Container>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              [FileCheck2, "Payload inmutable", "Monto, destino, fecha y estado al emitir quedan protegidos por una representación determinista."],
              [KeyRound, "Firma asimétrica", "La clave privada permanece en servidor; cada recibo conserva el keyId necesario para rotación."],
              [Database, "Estado actual separado", "Una reversión no invalida la firma histórica: el verificador muestra ambos estados claramente."]
            ].map(([Icon, title, copy]) => {
              const FeatureIcon = Icon as typeof FileCheck2;
              return (
                <article key={String(title)} className="border-t-2 border-ink pt-5">
                  <FeatureIcon className="text-brand" size={25} />
                  <h2 className="mt-4 text-xl font-bold">{String(title)}</h2>
                  <p className="mt-2 leading-7 text-muted">{String(copy)}</p>
                </article>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}
