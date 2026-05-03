import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { useLending, computeRisk, fmtUsd } from "@/lib/store";
import { ArciumComputeOverlay } from "@/components/ArciumComputeOverlay";
import { PageHeader } from "./app.deposit";
import { RiskBadge } from "@/components/RiskBadge";
import { TxPreview } from "@/components/TxPreview";
import { EditorialEmpty } from "@/components/EditorialStates";
import { PrivacyExplainerTrigger } from "@/components/PrivacyExplainer";
import { missingProtocolMessage, protocolConfigured } from "@/lib/protocol";
import { cipherLendClient } from "@/lib/cipherlendClient";

export const Route = createFileRoute("/app/repay")({
  component: RepayPage,
});

function RepayPage() {
  const { connected, walletAddress, borrowedUsdc, collateralSol, solPrice, marketStress, repay } =
    useLending();
  const r = computeRisk(collateralSol, borrowedUsdc, solPrice, marketStress);
  const [amount, setAmount] = useState(0);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const max = borrowedUsdc;
  const remaining = Math.max(0, borrowedUsdc - amount);
  const projected = computeRisk(collateralSol, remaining, solPrice, marketStress);

  const submit = async () => {
    if (amount <= 0 || amount > max) return;
    if (!protocolConfigured) {
      setError(missingProtocolMessage("Repaying USDC"));
      return;
    }
    setComputing(true);
    try {
      await cipherLendClient.submit({
        action: "repay",
        owner: walletAddress ?? "",
        amountUsdc: BigInt(Math.floor(amount * 1_000_000)),
      });
      repay(amount);
      setAmount(0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit repay.");
    } finally {
      setComputing(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Action · 03"
        title="Repay loan"
        sub="Reduce risk — re-encrypt new state."
      />

      {!connected ? (
        <EditorialEmpty
          eyebrow="Wallet required"
          title={<>Connect a wallet to repay.</>}
          body="You can only repay loans associated with your connected wallet."
          cta={{ to: "/app", label: "Back to dashboard" }}
        />
      ) : borrowedUsdc === 0 ? (
        <EditorialEmpty
          eyebrow="Nothing outstanding"
          title={
            <>
              No active loan to <em>repay</em>.
            </>
          }
          body="Borrow first to enable repayments. Your debt position never appears publicly."
          cta={{ to: "/app/borrow", label: "Borrow privately" }}
        />
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative border border-border rounded-xl bg-card p-6"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="label-eyebrow">Outstanding</span>
            <span className="font-mono">{fmtUsd(borrowedUsdc)}</span>
          </div>

          <div className="mt-3 flex items-center gap-3 border-b border-border pb-4">
            <div className="h-9 w-9 rounded-full border border-border grid place-items-center font-serif italic">
              $
            </div>
            <div className="flex-1 font-medium">USDC</div>
            <input
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(Math.min(max, Math.max(0, Number(e.target.value) || 0)))}
              placeholder="0"
              className="w-36 bg-transparent text-right font-serif text-3xl num focus:outline-none"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setAmount(max / 2)}
              className="rounded-md border border-border py-2 text-xs hover:border-foreground transition"
            >
              50%
            </button>
            <button
              onClick={() => setAmount(max)}
              className="rounded-md border border-border py-2 text-xs hover:border-foreground transition"
            >
              Repay full
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5">
            <div>
              <div className="label-eyebrow">Current</div>
              <div className="mt-1.5">
                <RiskBadge tier={r.tier} />
              </div>
            </div>
            <div>
              <div className="label-eyebrow">After repay</div>
              <div className="mt-1.5">
                <RiskBadge tier={projected.tier} />
              </div>
            </div>
          </div>

          {amount > 0 && (
            <div className="mt-6">
              <TxPreview
                title="Review · before you confirm"
                give={{
                  label: "From wallet",
                  amount: fmtUsd(amount),
                  sub: "USDC repayment",
                }}
                receive={{
                  label: "Reduced debt",
                  amount: fmtUsd(remaining),
                  sub: remaining === 0 ? "Loan fully closed" : "Outstanding after repay",
                }}
                details={[
                  { label: "Network fee", value: "0.000005 SOL", visibility: "onchain" },
                  {
                    label: "Protocol fee",
                    value: "$0.00",
                    hint: "No repayment penalty",
                    visibility: "onchain",
                  },
                  {
                    label: "Risk tier after",
                    value: projected.tier,
                    visibility: "offchain",
                    emphasis: true,
                  },
                  {
                    label: "Collateral unlocked",
                    value: remaining === 0 ? "Full position" : "Partial",
                    visibility: "offchain",
                  },
                ]}
              />
            </div>
          )}

          <button
            onClick={submit}
            disabled={amount <= 0 || amount > max || computing}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition"
          >
            {protocolConfigured
              ? `Submit real repay ${fmtUsd(amount)}`
              : "Configure program to repay"}
          </button>
          {error && (
            <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
              {error}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.15em] font-mono text-muted-foreground">
              Repayment public · new risk state re-encrypted
            </p>
            <PrivacyExplainerTrigger />
          </div>

          <ArciumComputeOverlay open={computing} label="Re-encrypting risk state…" />
        </motion.section>
      )}
    </div>
  );
}
