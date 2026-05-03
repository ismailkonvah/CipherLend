import { ArrowDown, EyeOff, Eye } from "lucide-react";

export type TxRow = {
  label: string;
  value: string;
  hint?: string;
  visibility?: "onchain" | "offchain";
  emphasis?: boolean;
};

export function TxPreview({
  title,
  give,
  receive,
  details,
}: {
  title: string;
  give: { label: string; amount: string; sub?: string };
  receive: { label: string; amount: string; sub?: string };
  details: TxRow[];
}) {
  return (
    <div className="border border-border rounded-xl bg-secondary/40">
      <div className="p-5 border-b border-border">
        <div className="label-eyebrow">{title}</div>
      </div>

      <div className="p-5 space-y-3">
        <Side label="You provide" main={give.amount} sub={give.sub ?? give.label} kind="give" />
        <div className="flex justify-center">
          <span className="h-7 w-7 rounded-full border border-border bg-card grid place-items-center">
            <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </div>
        <Side
          label="You receive"
          main={receive.amount}
          sub={receive.sub ?? receive.label}
          kind="receive"
        />
      </div>

      <div className="border-t border-border p-5 space-y-2">
        {details.map((d) => (
          <div
            key={d.label}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-muted-foreground">{d.label}</span>
              {d.visibility === "offchain" && (
                <span
                  title="Prepared for Arcium MPC"
                  className="inline-flex items-center text-accent"
                >
                  <EyeOff className="h-3 w-3" />
                </span>
              )}
              {d.visibility === "onchain" && (
                <span
                  title="Settled onchain"
                  className="inline-flex items-center text-muted-foreground"
                >
                  <Eye className="h-3 w-3" />
                </span>
              )}
            </div>
            <div className="ml-auto text-right">
              <div
                className={`font-mono num ${d.emphasis ? "text-foreground" : "text-foreground/80"}`}
              >
                {d.value}
              </div>
              {d.hint && <div className="text-[10px] text-muted-foreground">{d.hint}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Side({
  label,
  main,
  sub,
  kind,
}: {
  label: string;
  main: string;
  sub: string;
  kind: "give" | "receive";
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <div className="label-eyebrow">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
      </div>
      <div
        className={`ml-auto break-words text-right font-serif text-xl num sm:text-2xl ${
          kind === "receive" ? "text-foreground" : ""
        }`}
      >
        {main}
      </div>
    </div>
  );
}
