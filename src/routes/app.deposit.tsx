import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useLending, computeRisk, fmtUsd, fmtSol } from "@/lib/store";
import { ArciumComputeOverlay } from "@/components/ArciumComputeOverlay";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { TxPreview } from "@/components/TxPreview";
import { EditorialEmpty } from "@/components/EditorialStates";
import { PrivacyExplainerTrigger } from "@/components/PrivacyExplainer";
import { missingProtocolMessage, protocolConfigured } from "@/lib/protocol";
import { cipherLendClient } from "@/lib/cipherlendClient";

export const Route = createFileRoute("/app/deposit")({
  component: DepositPage,
});

function DepositPage() {
  const {
    connected,
    walletAddress,
    solBalance,
    collateralSol,
    borrowedUsdc,
    solPrice,
    marketStress,
    deposit,
    withdraw,
  } = useLending();
  const [amount, setAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [computing, setComputing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  const max = Number.isFinite(solBalance) ? Math.max(0, solBalance) : 0;
  const sliderMax = Math.max(max, amount, 1);
  const amountExceedsBalance = amount > max;
  const projected = computeRisk(collateralSol + amount, borrowedUsdc, solPrice, marketStress);
  const withdrawMax = borrowedUsdc > 0 ? 0 : collateralSol;
  const withdrawSliderMax = Math.max(withdrawMax, withdrawAmount, 1);
  const withdrawExceedsCollateral = withdrawAmount > withdrawMax;
  const networkFee = amount > 0 ? 0.000005 : 0; // SOL — illustrative

  const submit = async () => {
    if (amount <= 0 || amount > max) return;
    if (!protocolConfigured) {
      setError(missingProtocolMessage("Depositing collateral"));
      return;
    }
    setComputing(true);
    try {
      const result = await cipherLendClient.submit({
        action: "deposit",
        owner: walletAddress ?? "",
        lamports: BigInt(Math.floor(amount * 1_000_000_000)),
      });
      const depositedAmount = amount;
      deposit(amount);
      setAmount(0);
      setError(null);
      const message = `Deposit successful: ${fmtSol(depositedAmount)} moved into your vault.`;
      setSuccess(message);
      toast.success("Deposit successful", {
        description: result.signature
          ? `Confirmed on devnet: ${result.signature.slice(0, 8)}...${result.signature.slice(-8)}`
          : message,
      });
    } catch (err) {
      setSuccess(null);
      setError(err instanceof Error ? err.message : "Could not submit deposit.");
    } finally {
      setComputing(false);
    }
  };

  const submitWithdraw = async () => {
    if (withdrawAmount <= 0 || withdrawAmount > withdrawMax) return;
    if (!protocolConfigured) {
      setWithdrawError(missingProtocolMessage("Withdrawing collateral"));
      return;
    }
    setWithdrawing(true);
    try {
      const result = await cipherLendClient.submit({
        action: "withdraw",
        owner: walletAddress ?? "",
        lamports: BigInt(Math.floor(withdrawAmount * 1_000_000_000)),
      });
      const withdrawnAmount = withdrawAmount;
      withdraw(withdrawAmount);
      setWithdrawAmount(0);
      setWithdrawError(null);
      const message = `Withdraw successful: ${fmtSol(withdrawnAmount)} returned to your wallet.`;
      setWithdrawSuccess(message);
      toast.success("Withdraw successful", {
        description: result.signature
          ? `Confirmed on devnet: ${result.signature.slice(0, 8)}...${result.signature.slice(-8)}`
          : message,
      });
    } catch (err) {
      setWithdrawSuccess(null);
      setWithdrawError(err instanceof Error ? err.message : "Could not submit withdraw.");
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Action · 01"
        title="Deposit collateral"
        sub="Public deposit — private risk recomputation."
      />
      <OnboardingStepper active="deposit" />

      {!connected ? (
        <EditorialEmpty
          eyebrow="Wallet required"
          title={
            <>
              Connect a wallet to <em>deposit</em>.
            </>
          }
          body="Your collateral funds the position. Risk math runs privately inside Arcium MPC."
          cta={{ to: "/app", label: "Back to dashboard" }}
        />
      ) : (
        <>
          <motion.section
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative border border-border rounded-xl bg-card p-6"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="label-eyebrow">Asset</span>
              <span className="font-mono text-muted-foreground">
                Balance · {fmtSol(solBalance)}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3 border-b border-border pb-4">
              <div className="h-9 w-9 rounded-full border border-border grid place-items-center font-serif italic">
                S
              </div>
              <div className="flex-1">
                <div className="font-medium">SOL</div>
                <div className="text-xs text-muted-foreground">Solana</div>
              </div>
              <input
                type="number"
                value={amount || ""}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0.00"
                className="w-36 bg-transparent text-right font-serif text-3xl num focus:outline-none"
              />
            </div>

            <div className="mt-4">
              <input
                type="range"
                min={0}
                max={sliderMax}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full accent-foreground"
              />
              <div className="relative mt-2 h-[3px] bg-border overflow-hidden">
                {max > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 bg-success/50"
                    style={{ width: `${Math.min(100, (max / sliderMax) * 100)}%` }}
                  />
                )}
                <div
                  className={`absolute inset-y-0 left-0 transition-all ${
                    amountExceedsBalance ? "bg-warning" : "bg-foreground"
                  }`}
                  style={{ width: `${Math.min(100, (amount / sliderMax) * 100)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
                <span>0</span>
                <span>Wallet max {fmtSol(max)}</span>
                <button
                  onClick={() => setAmount(max)}
                  disabled={max <= 0}
                  className="hover:text-foreground disabled:opacity-40 transition"
                >
                  Max
                </button>
              </div>
              {amountExceedsBalance && (
                <div className="mt-2 text-xs text-warning">
                  Amount exceeds your devnet wallet balance of {fmtSol(max)}.
                </div>
              )}
            </div>

            {/* Preview */}
            {amount > 0 && (
              <div className="mt-6">
                <TxPreview
                  title="Review · before you confirm"
                  give={{
                    label: "From wallet",
                    amount: fmtSol(amount),
                    sub: `≈ ${fmtUsd(amount * solPrice)}`,
                  }}
                  receive={{
                    label: "Collateral position",
                    amount: fmtSol(collateralSol + amount),
                    sub: `+ ${fmtUsd(amount * solPrice)} value`,
                  }}
                  details={[
                    {
                      label: "Network fee",
                      value: `${networkFee} SOL`,
                      hint: "Solana base fee",
                      visibility: "onchain",
                    },
                    {
                      label: "Protocol fee",
                      value: "$0.00",
                      hint: "No deposit fee",
                      visibility: "onchain",
                    },
                    {
                      label: "New borrow capacity",
                      value: fmtUsd(projected.maxBorrow),
                      visibility: "offchain",
                      emphasis: true,
                    },
                    {
                      label: "Available to borrow",
                      value: fmtUsd(projected.safeBorrow),
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
              {protocolConfigured ? "Confirm real deposit" : "Configure program to deposit"}
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
                Deposit visible onchain · risk state encrypted
              </p>
              <PrivacyExplainerTrigger />
            </div>

            <ArciumComputeOverlay open={computing} label="Recomputing risk privately…" />
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="relative border border-border rounded-xl bg-card p-6"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="label-eyebrow">Withdraw collateral</span>
              <span className="font-mono text-muted-foreground">
                Deposited · {fmtSol(collateralSol)}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3 border-b border-border pb-4">
              <div className="h-9 w-9 rounded-full border border-border grid place-items-center font-serif italic">
                S
              </div>
              <div className="flex-1">
                <div className="font-medium">SOL</div>
                <div className="text-xs text-muted-foreground">
                  {borrowedUsdc > 0
                    ? "Repay active or pending debt before withdrawing"
                    : "Return collateral from your vault PDA"}
                </div>
              </div>
              <input
                type="number"
                value={withdrawAmount || ""}
                onChange={(e) => setWithdrawAmount(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0.00"
                disabled={withdrawMax <= 0}
                className="w-36 bg-transparent text-right font-serif text-3xl num focus:outline-none disabled:opacity-40"
              />
            </div>

            <div className="mt-4">
              <input
                type="range"
                min={0}
                max={withdrawSliderMax}
                step={0.01}
                value={withdrawAmount}
                disabled={withdrawMax <= 0}
                onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                className="w-full accent-foreground disabled:opacity-30"
              />
              <div className="relative mt-2 h-[3px] bg-border overflow-hidden">
                {withdrawMax > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 bg-success/50"
                    style={{ width: `${Math.min(100, (withdrawMax / withdrawSliderMax) * 100)}%` }}
                  />
                )}
                <div
                  className={`absolute inset-y-0 left-0 transition-all ${
                    withdrawExceedsCollateral ? "bg-warning" : "bg-foreground"
                  }`}
                  style={{ width: `${Math.min(100, (withdrawAmount / withdrawSliderMax) * 100)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
                <span>0</span>
                <span>Withdraw max {fmtSol(withdrawMax)}</span>
                <button
                  onClick={() => setWithdrawAmount(withdrawMax)}
                  disabled={withdrawMax <= 0}
                  className="hover:text-foreground disabled:opacity-40 transition"
                >
                  Max
                </button>
              </div>
              {borrowedUsdc > 0 && (
                <div className="mt-2 text-xs text-warning">
                  Withdraw is locked while your private borrow request or debt is outstanding.
                </div>
              )}
              {withdrawExceedsCollateral && (
                <div className="mt-2 text-xs text-warning">
                  Amount exceeds withdrawable collateral of {fmtSol(withdrawMax)}.
                </div>
              )}
            </div>

            {withdrawAmount > 0 && (
              <div className="mt-6">
                <TxPreview
                  title="Review - before you confirm"
                  give={{
                    label: "From vault PDA",
                    amount: fmtSol(withdrawAmount),
                    sub: `~ ${fmtUsd(withdrawAmount * solPrice)}`,
                  }}
                  receive={{
                    label: "Wallet balance",
                    amount: fmtSol(solBalance + withdrawAmount),
                    sub: "SOL returned to signer",
                  }}
                  details={[
                    { label: "Network fee", value: "0.000005 SOL", visibility: "onchain" },
                    {
                      label: "Protocol fee",
                      value: "$0.00",
                      hint: "No withdraw fee",
                      visibility: "onchain",
                    },
                    {
                      label: "Remaining collateral",
                      value: fmtSol(Math.max(0, collateralSol - withdrawAmount)),
                      visibility: "onchain",
                      emphasis: true,
                    },
                  ]}
                />
              </div>
            )}

            <button
              onClick={submitWithdraw}
              disabled={withdrawAmount <= 0 || withdrawAmount > withdrawMax || withdrawing}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition"
            >
              {protocolConfigured ? "Confirm real withdraw" : "Configure program to withdraw"}
            </button>
            {withdrawError && (
              <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                {withdrawError}
              </div>
            )}
            {withdrawSuccess && !withdrawError && (
              <div className="mt-3 rounded-md border border-success/40 bg-success/10 p-3 text-xs text-success">
                {withdrawSuccess}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.15em] font-mono text-muted-foreground">
                Withdraw visible onchain · private debt guard enforced
              </p>
              <PrivacyExplainerTrigger />
            </div>

            <ArciumComputeOverlay open={withdrawing} label="Withdrawing collateral..." />
          </motion.section>
        </>
      )}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="mb-2">
      <div className="label-eyebrow">{eyebrow}</div>
      <h1 className="mt-2 font-serif text-3xl md:text-4xl tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}
