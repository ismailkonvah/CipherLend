import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
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
  const {
    connected,
    walletAddress,
    collateralSol,
    borrowedUsdc,
    pendingBorrowUsdc,
    solPrice,
    marketStress,
    borrow,
  } = useLending();
  const totalDebtUsdc = borrowedUsdc + pendingBorrowUsdc;
  const hasPendingSettlement = pendingBorrowUsdc > 0;
  const r = computeRisk(collateralSol, totalDebtUsdc, solPrice, marketStress);
  const [amount, setAmount] = useState(0);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const max =
    !hasPendingSettlement && Number.isFinite(r.safeBorrow) ? Math.max(0, Math.floor(r.safeBorrow)) : 0;
  const projected = computeRisk(collateralSol, totalDebtUsdc + amount, solPrice, marketStress);
  const originationFeeBps = 10; // 0.10%
  const originationFee = (amount * originationFeeBps) / 10_000;
  const netReceived = Math.max(0, amount - originationFee);

  const submit = async () => {
    if (hasPendingSettlement) {
      setError("A borrow request is already pending Arcium settlement. Repay it before borrowing again.");
      return;
    }
    if (amount <= 0 || amount > max) return;
    if (!protocolConfigured) {
      setError(missingProtocolMessage("Borrowing USDC"));
      return;
    }
    setComputing(true);
    try {
      const result = await cipherLendClient.submit({
        action: "borrow",
        owner: walletAddress ?? "",
        amountUsdc: BigInt(Math.floor(amount * 1_000_000)),
        collateralLamports: BigInt(Math.floor(collateralSol * 1_000_000_000)),
        borrowedUsdc: BigInt(Math.floor(totalDebtUsdc * 1_000_000)),
        solPriceMicroUsd: BigInt(Math.floor(solPrice * 1_000_000)),
        marketStressBps: BigInt(Math.floor(marketStress * 10_000)),
      });
      const borrowedAmount = amount;
      borrow(amount);
      setAmount(0);
      setError(null);
      const message = `Encrypted borrow request submitted: ${fmtUsd(borrowedAmount)}.`;
      setSuccess(message);
      toast.success("Borrow request submitted", {
        description: result.signature
          ? `Confirmed on devnet: ${result.signature.slice(0, 8)}...${result.signature.slice(-8)}`
          : message,
      });
    } catch (err) {
      setSuccess(null);
      setError(err instanceof Error ? err.message : "Could not submit borrow.");
    } finally {
      setComputing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-6">
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
          {hasPendingSettlement && (
            <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
              {fmtUsd(pendingBorrowUsdc)} is pending Arcium settlement. Repay the pending request
              before submitting another private borrow.
            </div>
          )}

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
              className="w-24 bg-transparent text-right font-serif text-2xl num focus:outline-none sm:w-36 sm:text-3xl"
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
                    value: fmtUsd(totalDebtUsdc + amount),
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
            disabled={amount <= 0 || amount > max || computing || hasPendingSettlement}
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
          {success && !error && (
            <div className="mt-3 rounded-md border border-success/40 bg-success/10 p-3 text-xs text-success">
              {success}
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
