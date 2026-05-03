import type { RiskTier } from "@/lib/store";

const config: Record<RiskTier, { label: string; dot: string; text: string; bar: string }> = {
  Secure: { label: "Secure", dot: "bg-success", text: "text-success", bar: "bg-success" },
  Healthy: {
    label: "Healthy",
    dot: "bg-foreground",
    text: "text-foreground",
    bar: "bg-foreground",
  },
  "Risk Elevated": {
    label: "Risk elevated",
    dot: "bg-warning",
    text: "text-warning",
    bar: "bg-warning",
  },
  Critical: { label: "Critical", dot: "bg-danger", text: "text-danger", bar: "bg-danger" },
};

export function RiskBadge({ tier }: { tier: RiskTier }) {
  const c = config[tier];
  return (
    <span className={`inline-flex items-center gap-2 text-sm font-medium ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

export function RiskBar({ tier }: { tier: RiskTier }) {
  const c = config[tier];
  const widths: Record<RiskTier, string> = {
    Secure: "w-1/4",
    Healthy: "w-2/4",
    "Risk Elevated": "w-3/4",
    Critical: "w-full",
  };
  return (
    <div className="h-[3px] w-full bg-border overflow-hidden">
      <div className={`h-full ${c.bar} ${widths[tier]} transition-all duration-700`} />
    </div>
  );
}
