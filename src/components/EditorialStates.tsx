import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

export function EditorialEmpty({
  eyebrow,
  title,
  body,
  cta,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  cta?: { to: string; label: string };
}) {
  return (
    <div className="border border-dashed border-border rounded-xl bg-card/50 px-8 py-14 text-center">
      <div className="label-eyebrow">{eyebrow}</div>
      <h2 className="mt-3 font-serif text-2xl md:text-3xl tracking-tight max-w-md mx-auto">
        {title}
      </h2>
      <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">{body}</p>
      {cta && (
        <Link
          to={cta.to}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90 transition"
        >
          {cta.label} <ArrowUpRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export function EditorialSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-border/70 rounded-sm"
          style={{ width: `${100 - i * 12}%` }}
        />
      ))}
    </div>
  );
}

export function EditorialMetricSkeleton() {
  return (
    <div className="p-5 animate-pulse">
      <div className="h-2.5 w-16 bg-border/70 rounded-sm" />
      <div className="mt-3 h-7 w-24 bg-border/60 rounded-sm" />
      <div className="mt-2 h-2 w-12 bg-border/40 rounded-sm" />
    </div>
  );
}
