import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { useLending, computeRisk, fmtUsd } from "@/lib/store";
import { ArciumComputeOverlay } from "@/components/ArciumComputeOverlay";
import { PageHeader } from "./app.deposit";
import { RiskBadge, RiskBar } from "@/components/RiskBadge";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { TxPreview } from "@/components/TxPreview";
import { EditorialEmpty } from "@/components/EditorialStates";
import { PrivacyExplainerTrigger } from "@/components/PrivacyExplainer";
import { missingProtocolMessage, protocolConfigured } from "@/lib/protocol";
import { cipherLendClient } from "@/lib/cipherlendClient";

export const Route = createFileRoute("/app/borrow")({
  component: BorrowPage,
});

function BorrowPage() {
  const { connected, walletAddress, collateralSol, borrowedUsdc, solPrice, marketStress, borrow } =
    useLending();
  const r = computeRisk(collateralSol, borrowedUsdc, solPrice, marketStress);
  const [amount, setAmount] = useState(0);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const max = Number.isFinite(r.safeBorrow) ? Math.max(0, Math.floor(r.safeBorrow)) : 0;
  const projected = computeRisk(collateralSol, borrowedUsdc + amount, solPrice, marketStress);
  const originationFeeBps = 10; // 0.10%
  const originationFee = (amount * originationFeeBps) / 10_000;
  const netReceived = Math.max(0, amount - originationFee);

  const submit = async () => {
    if (amount <= 0 || amount > max) return;
    if (!protocolConfigured) {
      setError(missingProtocolMessage("Borrowing USDC"));
      return;
    }
    setComputing(true);
    try {
      await cipherLendClient.submit({
        action: "borrow",
        owner: walletAddress ?? "",
        amountUsdc: BigInt(Math.floor(amount * 1_000_000)),
        collateralLamports: BigInt(Math.floor(collateralSol * 1_000_000_000)),
        borrowedUsdc: BigInt(Math.floor(borrowedUsdc * 1_000_000)),
        solPriceMicroUsd: BigInt(Math.floor(solPrice * 1_000_000)),
        marketStressBps: BigInt(Math.floor(marketStress * 10_000)),
      });
      borrow(amount);
      setAmount(0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit borrow.");
    } finally {
      setComputing(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Action · 02"
        title="Borrow USDC"
        sub="Borrow-risk inputs are encrypted for Arcium MPC verification."
      />
      <OnboardingStepper active="borrow" />

      {!connected ? (
        <EditorialEmpty
          eyebrow="Wallet required"
          title={<>Connect a wallet to begin.</>}
          body="Borrowing requires both an active wallet and deposited collateral."
          cta={{ to: "/app", label: "Back to dashboard" }}
        />
      ) : collateralSol === 0 ? (
        <EditorialEmpty
          eyebrow="No collateral"
          title={
            <>
              Deposit first to <em>unlock</em> private borrowing.
            </>
          }
          body="CipherLend encrypts borrow-risk inputs so the protocol can move toward private eligibility checks without revealing your health factor."
          cta={{ to: "/app/deposit", label: "Deposit collateral" }}
        />
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative border border-border rounded-xl bg-card p-6"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="label-eyebrow">Safe borrow limit · private</span>
            <span className="font-mono">{fmtUsd(max)}</span>
          </div>

          <div className="mt-3 flex items-center gap-3 border-b border-border pb-4">
            <div className="h-9 w-9 rounded-full border border-border grid place-items-center font-serif italic">
              $
            </div>
            <div className="flex-1">
              <div className="font-medium">USDC</div>
              <div className="text-xs text-muted-foreground">Stablecoin</div>
            </div>
            <input
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(Math.min(max, Math.max(0, Number(e.target.value) || 0)))}
              placeholder="0"
              className="w-36 bg-transparent text-right font-serif text-3xl num focus:outline-none"
            />
          </div>

          <div className="mt-5">
            <input
              type="range"
              min={0}
              max={max}
              step={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full accent-foreground"
            />
            <div className="relative mt-2 h-[3px] bg-border overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-foreground transition-all"
                style={{ width: `${max > 0 ? (amount / max) * 100 : 0}%` }}
              />
              <div className="absolute inset-y-0 left-[75%] w-px bg-warning" />
              <div className="absolute inset-y-0 left-[95%] w-px bg-danger" />
            </div>
            <div className="mt-1 flex justify-between text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
              <span>0</span>
              <span>Safe zone</span>
              <button onClick={() => setAmount(max)} className="hover:text-foreground transition">
                Max
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5">
            <div>
              <div className="label-eyebrow">After borrow</div>
              <div className="mt-1.5">
                <RiskBadge tier={projected.tier} />
              </div>
            </div>
            <div>
              <div className="label-eyebrow">Collateral</div>
              <div className="mt-1 font-serif text-xl num">{fmtUsd(r.collateralUsd)}</div>
            </div>
            <div className="col-span-2">
              <div className="label-eyebrow mb-2">Risk position · private</div>
              <RiskBar tier={projected.tier} />
            </div>
          </div>

          {/* Preview */}
          {amount > 0 && (
            <div className="mt-6">
              <TxPreview
                title="Review · before you confirm"
                give={{
                  label: "Locked as backing",
                  amount: fmtUsd(r.collateralUsd),
                  sub: "Already deposited",
                }}
                receive={{
                  label: "USDC to wallet",
                  amount: fmtUsd(netReceived),
                  sub: `Borrowing ${fmtUsd(amount)}`,
                }}
                details={[
                  {
                    label: "Origination fee (0.10%)",
                    value: fmtUsd(originationFee),
                    visibility: "onchain",
                  },
                  { label: "Network fee", value: "0.000005 SOL", visibility: "onchain" },
                  {
                    label: "Total debt after",
                    value: fmtUsd(borrowedUsdc + amount),
                    emphasis: true,
                    visibility: "onchain",
                  },
                  {
                    label: "New risk tier",
                    value: projected.tier,
                    hint: "Exact health factor stays private",
                    visibility: "offchain",
                    emphasis: true,
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
              ? `Submit encrypted borrow request ${fmtUsd(amount)}`
              : "Configure program to borrow"}
          </button>
          {error && (
            <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
              {error}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.15em] font-mono text-muted-foreground">
              Risk inputs encrypted for Arcium · approval callback is the next protocol milestone
            </p>
            <PrivacyExplainerTrigger />
          </div>

          <ArciumComputeOverlay open={computing} label="Verifying privately with Arcium…" />
        </motion.section>
      )}
    </div>
  );
}
