import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useLending } from "@/lib/store";
import { PageHeader } from "./app.deposit";

export const Route = createFileRoute("/app/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  const { marketStress, setMarketStress } = useLending();
  return (
    <div className="w-full max-w-4xl space-y-8 md:space-y-10">
      <PageHeader
        eyebrow="System"
        title="Privacy engine"
        sub="The boundary between public chain and confidential computation."
      />

      <section className="grid md:grid-cols-2 border border-border rounded-xl overflow-hidden bg-card">
        <div className="p-6 border-b md:border-b-0 md:border-r border-border">
          <div className="label-eyebrow">Public · onchain</div>
          <ul className="mt-4 divide-y divide-border">
            {[
              "Deposit transactions",
              "Repayment transactions",
              "Approved borrow outputs",
              "Total protocol TVL",
            ].map((x) => (
              <li key={x} className="py-2.5 text-sm flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">●</span>
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-6 bg-secondary/40">
          <div className="label-eyebrow text-accent">Encrypted · arcium</div>
          <ul className="mt-4 divide-y divide-border">
            {[
              "Health factor & liquidation point",
              "Dynamic LTV per position",
              "Borrower risk score",
              "Interest rate adjustments",
              "Liquidation eligibility",
            ].map((x) => (
              <li key={x} className="py-2.5 text-sm flex items-center gap-3">
                <span className="font-mono text-xs text-accent">◆</span>
                {x}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Encrypted flow */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-border rounded-xl bg-card p-6 md:p-8"
      >
        <div className="label-eyebrow">Live encrypted flow</div>

        <div className="mt-6 space-y-4 overflow-hidden font-mono text-xs">
          <Box label="01 · Frontend · wallet & UI" />
          <Pipe />
          <Box label="02 · Anchor program · Solana" />
          <Pipe note="encrypted inputs" />
          <Box label="03 · Arcium MPC · risk engine" highlight />
          <div className="ml-8 text-[10px] text-muted-foreground">
            computeHealth() · computeLTV() · checkLiquidation() · scoreRisk()
          </div>
          <Pipe note="verified outputs only" />
          <Box label="04 · Solana state · borrow approval, payout" />
        </div>
      </motion.section>

      {/* Market simulator */}
      <section className="border border-border rounded-xl bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="label-eyebrow">Simulator</div>
            <div className="mt-1 font-serif text-2xl">Market stress</div>
            <p className="text-xs text-muted-foreground mt-1">
              Triggers private re-evaluation of LTV and liquidation thresholds.
            </p>
          </div>
          <span className="font-mono text-2xl num sm:text-3xl">
            {(marketStress * 100).toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={marketStress}
          onChange={(e) => setMarketStress(Number(e.target.value))}
          className="mt-5 w-full accent-foreground"
        />
        <div className="mt-1 flex justify-between text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
          <span>Calm</span>
          <span>Volatile</span>
          <span>Crash</span>
        </div>
      </section>
    </div>
  );
}

function Box({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <div
      className={`px-3 py-2 border ${highlight ? "border-accent bg-accent/10" : "border-border bg-background"}`}
    >
      {label}
    </div>
  );
}
function Pipe({ note }: { note?: string }) {
  return (
    <div className="flex items-center gap-2 pl-3 text-muted-foreground">
      <span>↓</span>
      {note && <span className="text-[10px] uppercase tracking-[0.15em]">{note}</span>}
    </div>
  );
}
