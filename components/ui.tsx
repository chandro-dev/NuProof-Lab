import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Container({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-6xl px-5 ${className}`}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  description
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8">
      {eyebrow ? (
        <p className="mb-2 text-xs font-bold uppercase text-brand">{eyebrow}</p>
      ) : null}
      <h1 className="text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
      {description ? <p className="mt-3 max-w-2xl leading-7 text-muted">{description}</p> : null}
    </div>
  );
}

export function Button({
  children,
  icon: Icon,
  tone = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon;
  tone?: "primary" | "secondary" | "danger";
}) {
  const toneClass = {
    primary: "bg-brand text-white hover:bg-brand-dark",
    secondary: "border border-line bg-white text-ink hover:bg-surface",
    danger: "bg-danger text-white hover:bg-red-800"
  }[tone];
  return (
    <button
      {...props}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass} ${className}`}
    >
      {Icon ? <Icon size={19} aria-hidden /> : null}
      {children}
    </button>
  );
}

export function ActionLink({
  href,
  children,
  icon: Icon,
  secondary = false
}: {
  href: string;
  children: ReactNode;
  icon?: LucideIcon;
  secondary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 font-semibold transition ${
        secondary
          ? "border border-white/50 bg-black/20 text-white hover:bg-black/35"
          : "bg-white text-ink hover:bg-surface"
      }`}
    >
      {Icon ? <Icon size={19} aria-hidden /> : null}
      {children}
    </Link>
  );
}

export function Field({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      <input
        {...props}
        className="h-12 w-full rounded-md border border-line bg-white px-4 text-base text-ink placeholder:text-gray-400"
      />
      {error ? <span className="mt-1 block text-sm text-danger">{error}</span> : null}
    </label>
  );
}

export function StatusPill({ status }: { status: string }) {
  const style =
    status === "SETTLED"
      ? "bg-success-soft text-success"
      : status === "REVERSED"
        ? "bg-warning-soft text-warning"
        : "bg-surface text-muted";
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}>{status}</span>;
}

export function ErrorNotice({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-md border border-red-200 bg-danger-soft p-4 text-danger">
      {children}
    </div>
  );
}
