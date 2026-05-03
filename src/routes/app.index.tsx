import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useLending, computeRisk, fmtUsd, fmtSol } from "@/lib/store";
import { RiskBadge, RiskBar } from "@/components/RiskBadge";
import { EncryptedValue } from "@/components/EncryptedValue";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { PrivacyExplainerTrigger } from "@/components/PrivacyExplainer";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { connected, collateralSol, borrowedUsdc, solPrice, marketStress } = useLending();
  const r = computeRisk(collateralSol, borrowedUsdc, solPrice, marketStress);

  const onboardingComplete = connected && collateralSol > 0 && borrowedUsdc > 0;

  return (
    <div className="max-w-5xl space-y-10">
      {/* Onboarding — visible until user has completed all 3 steps */}
      {!onboardingComplete && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="label-eyebrow">Get started</div>
            <PrivacyExplainerTrigger />
          </div>
          <OnboardingStepper />
        </section>
      )}

      {!connected ? (
        <EmptyState />
      ) : (
        <>
          {/* Header */}
          <motion.section
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-12 gap-6 items-end"
          >
            <div className="md:col-span-7">
              <div className="label-eyebrow">Position · overview</div>
              <h1 className="mt-2 font-serif text-5xl md:text-6xl tracking-tight num">
                {fmtUsd(r.collateralUsd)}
              </h1>
              <div className="mt-2 text-sm text-muted-foreground">
                {fmtSol(collateralSol)} collateral
              </div>
            </div>
            <div className="md:col-span-5 flex flex-col items-start md:items-end gap-2">
              <RiskBadge tier={r.tier} />
              <div className="text-xs text-muted-foreground font-mono">verified · arcium mpc</div>
              <div className="w-full md:w-56 mt-1">
                <RiskBar tier={r.tier} />
              </div>
            </div>
          </motion.section>

          {/* Metrics grid */}
          <section className="border-y border-border grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border">
            <Stat label="Borrowed" value={fmtUsd(borrowedUsdc)} sub="USDC" />
            <Stat label="Safe borrow" value={fmtUsd(r.safeBorrow)} sub="Available" />
            <StatCustom label="Health factor" sub="Reveal locally">
              <EncryptedValue value={r.health === Infinity ? "∞" : r.health.toFixed(2)} />
            </StatCustom>
            <StatCustom label="Liquidation" sub="Encrypted">
              <span className="font-mono tracking-[0.25em] text-muted-foreground">······</span>
            </StatCustom>
          </section>

          {/* Quick actions */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="label-eyebrow">Actions</div>
              <PrivacyExplainerTrigger />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Action to="/app/deposit" title="Deposit" />
              <Action to="/app/borrow" title="Borrow" emphasis />
              <Action to="/app/repay" title="Repay" />
              <Action to="/app/liquidation" title="Liquidation watch" />
            </div>
          </section>

          {/* Footnote */}
          <section className="border-t border-border pt-6">
            <p className="font-serif text-xl md:text-2xl leading-snug max-w-2xl">
              "Your risk profile is invisible to the public chain. Liquidation bots cannot see your
              exact threshold. MEV searchers cannot target your position."
            </p>
            <div className="mt-3 label-eyebrow">— CipherLend whitepaper, §2.4</div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="p-5">
      <div className="label-eyebrow">{label}</div>
      <div className="mt-2 font-serif text-3xl num">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
function StatCustom({
  label,
  sub,
  children,
}: {
  label: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-5">
      <div className="label-eyebrow">{label}</div>
      <div className="mt-2 text-2xl">{children}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function Action({ to, title, emphasis }: { to: string; title: string; emphasis?: boolean }) {
  return (
    <Link
      to={to}
      className={`group flex items-center justify-between border px-5 py-4 rounded-md transition ${
        emphasis
          ? "border-foreground bg-foreground text-background hover:opacity-90"
          : "border-border hover:border-foreground"
      }`}
    >
      <span className="font-medium">{title}</span>
      <ArrowUpRight
        className={`h-4 w-4 ${emphasis ? "text-background" : "text-muted-foreground group-hover:text-foreground"} transition`}
      />
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="max-w-xl mx-auto mt-10 text-center">
      <div className="label-eyebrow">Empty position</div>
      <h1 className="mt-3 font-serif text-4xl md:text-5xl tracking-tight">
        Your lending profile is <span className="italic">built for privacy</span>.
      </h1>
      <p className="mt-4 text-muted-foreground">
        Follow the three steps above to begin. Nothing is computed in the open.
      </p>
    </div>
  );
}
