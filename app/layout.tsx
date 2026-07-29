import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { FlaskConical, Landmark, ScanLine, ShieldCheck } from "lucide-react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "NuProof Lab",
    template: "%s | NuProof Lab"
  },
  description: "Proof of Concept de comprobantes bancarios verificables con firmas digitales.",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans antialiased">
        <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
            <Link href="/" className="flex items-center gap-2 font-bold text-ink">
              <span className="flex size-9 items-center justify-center rounded-md bg-brand text-white">
                <ShieldCheck size={20} aria-hidden />
              </span>
              NuProof Lab
            </Link>
            <nav aria-label="Navegación principal" className="flex items-center gap-1">
              <Link
                href="/verify"
                className="flex size-10 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-ink sm:w-auto sm:gap-2 sm:px-3"
                title="Verificar"
              >
                <ScanLine size={19} />
                <span className="hidden sm:inline">Verificar</span>
              </Link>
              <Link
                href="/security-lab"
                className="flex size-10 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-ink sm:w-auto sm:gap-2 sm:px-3"
                title="Security Lab"
              >
                <FlaskConical size={19} />
                <span className="hidden md:inline">Security Lab</span>
              </Link>
              <Link
                href="/issuer"
                className="flex size-10 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-ink sm:w-auto sm:gap-2 sm:px-3"
                title="Issuer Simulator"
              >
                <Landmark size={19} />
                <span className="hidden md:inline">Issuer</span>
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-line bg-surface">
          <div className="mx-auto max-w-7xl px-5 py-8 text-center text-xs leading-5 text-muted">
            NuProof Lab is an independent technical Proof of Concept. It is not affiliated with,
            endorsed by, or operated by Nu. Todos los datos son ficticios.
          </div>
        </footer>
      </body>
    </html>
  );
}
