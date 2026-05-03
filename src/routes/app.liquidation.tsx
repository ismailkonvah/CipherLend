import { createFileRoute } from "@tanstack/react-router";
import { useLending, computeRisk } from "@/lib/store";
import { EditorialEmpty } from "@/components/EditorialStates";
import { PageHeader } from "./app.deposit";
import { RiskBar, RiskBadge } from "@/components/RiskBadge";
import { PrivacyExplainerTrigger } from "@/components/PrivacyExplainer";

export const Route = createFileRoute("/app/liquidation")({
  component: LiquidationPage,
});

function LiquidationPage() {
  const { connected, collateralSol, borrowedUsdc, pendingBorrowUsdc, solPrice, marketStress } =
    useLending();
  const totalDebtUsdc = borrowedUsdc + pendingBorrowUsdc;
  const r = computeRisk(collateralSol, totalDebtUsdc, solPrice, marketStress);

  return (
    <div className="w-full max-w-3xl">
      <PageHeader
        eyebrow="Surveillance · 04"
        title="Liquidation watch"
        sub="Your exact threshold stays encrypted. CipherLend only signals proximity."
      />

      {!connected ? (
        <EditorialEmpty
          eyebrow="Disconnected"
          title={
            <>
              Connect a wallet to monitor <em>your</em> position.
            </>
          }
          body="CipherLend is designed to keep liquidation thresholds in the encrypted Arcium risk path instead of exposing raw health factors."
          cta={{ to: "/app", label: "Go to dashboard" }}
        />
      ) : totalDebtUsdc === 0 ? (
        <EditorialEmpty
          eyebrow="No active loan"
          title={<>Nothing to liquidate. Yet.</>}
          body="Your position becomes monitored once you borrow. Until then there is no risk."
          cta={{ to: "/app/borrow", label: "Borrow privately" }}
        />
      ) : (
        <section className="border border-border rounded-xl bg-card p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="label-eyebrow">Current tier</div>
              <div className="mt-2">
                <RiskBadge tier={r.tier} />
              </div>
            </div>
            <PrivacyExplainerTrigger>How is this private?</PrivacyExplainerTrigger>
          </div>
          {pendingBorrowUsdc > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
              Pending Arcium settlement is included in this liquidation watch.
            </div>
          )}

          <div>
            <div className="label-eyebrow mb-2">Proximity to liquidation · private</div>
            <RiskBar tier={r.tier} />
            <div className="mt-2 flex justify-between text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
              <span>Safe</span>
              <span>Critical</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-border pt-5 text-sm sm:grid-cols-2">
            <div>
              <div className="label-eyebrow">Exact threshold</div>
              <div className="mt-1 font-mono tracking-[0.25em] text-muted-foreground">······</div>
              <div className="text-[10px] text-muted-foreground mt-1">Encrypted · offchain</div>
            </div>
            <div>
              <div className="label-eyebrow">MEV exposure</div>
              <div className="mt-1 font-serif text-xl">None</div>
              <div className="text-[10px] text-muted-foreground mt-1">
                No public health factor to target
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
