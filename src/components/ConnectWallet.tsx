import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useLending } from "@/lib/store";
import { cipherLendClient } from "@/lib/cipherlendClient";
import {
  connectWallet,
  disconnectWallet,
  getSolBalance,
  shortAddress,
  SUPPORTED_WALLETS,
  type WalletName,
} from "@/lib/solana";

export function ConnectWallet({ variant = "default" }: { variant?: "default" | "compact" }) {
  const {
    connected,
    walletLabel,
    walletAddress,
    solBalance,
    connect,
    disconnect,
    setSolBalance,
    setPosition,
  } = useLending();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState<WalletName | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalance = useCallback(
    async (address = walletAddress) => {
      if (!address) return;
      setRefreshing(true);
      try {
        const [balance, position] = await Promise.all([
          getSolBalance(address),
          cipherLendClient.getPosition(address),
        ]);
        setSolBalance(balance);
        if (position) {
          const collateralSol = Number(position.collateralLamports) / 1_000_000_000;
          const borrowedUsdc = Number(position.borrowedUsdc) / 1_000_000;
          const pendingBorrowUsdc = Number(position.pendingBorrowUsdc) / 1_000_000;
          setPosition(collateralSol, borrowedUsdc, pendingBorrowUsdc);
        } else {
          setPosition(0, 0);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read Solana position.");
      } finally {
        setRefreshing(false);
      }
    },
    [setPosition, setSolBalance, walletAddress],
  );

  const handleConnect = async (wallet: WalletName) => {
    setError(null);
    setConnecting(wallet);
    try {
      const result = await connectWallet(wallet);
      connect(wallet, result.address);
      setOpen(false);
      await refreshBalance(result.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not connect ${wallet}.`);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async () => {
    setError(null);
    await disconnectWallet(walletLabel as WalletName | null);
    disconnect();
  };

  if (connected && walletAddress) {
    return (
      <div className="flex min-w-0 max-w-[52vw] flex-col items-end gap-1 sm:max-w-none">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(walletAddress);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            title={`Copy ${walletAddress}`}
            className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs font-mono hover:border-foreground transition sm:px-3"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
            <span className="truncate sm:hidden">
              {shortAddress(walletAddress)} · {solBalance.toFixed(2)}
            </span>
            <span className="hidden truncate sm:inline">
              {walletLabel} · {shortAddress(walletAddress)} · {solBalance.toFixed(3)} SOL
            </span>
            {copied ? (
              <Check className="h-3 w-3 shrink-0 text-success" />
            ) : (
              <Copy className="h-3 w-3 shrink-0 text-muted-foreground" />
            )}
          </button>
          {variant === "default" && (
            <button
              onClick={() => refreshBalance()}
              disabled={refreshing}
              title="Refresh SOL balance from devnet RPC"
              className="text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          )}
          {variant === "default" && (
            <a
              href={`https://explorer.solana.com/address/${walletAddress}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              title="Open connected wallet on devnet explorer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {variant === "default" && (
            <button
              onClick={handleDisconnect}
              className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline"
            >
              Sign out
            </button>
          )}
        </div>
        {variant === "default" && error && (
          <div className="max-w-sm rounded-md border border-danger/30 bg-danger/10 px-2 py-1 text-[11px] text-danger">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90 transition sm:px-4"
      >
        <span className="sm:hidden">Connect</span>
        <span className="hidden sm:inline">Connect wallet</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-xl bg-card border border-border p-6 shadow-xl"
            >
              <div className="label-eyebrow">Step 01</div>
              <h3 className="font-serif text-2xl mt-1">Choose a wallet.</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                CipherLend connects to your installed Solana wallet and reads balance from RPC.
              </p>
              <div className="mt-5 divide-y divide-border border-y border-border">
                {SUPPORTED_WALLETS.map((wallet) => (
                  <button
                    key={wallet}
                    onClick={() => handleConnect(wallet)}
                    disabled={connecting !== null}
                    className="group flex w-full items-center justify-between py-3 hover:text-accent disabled:opacity-50 transition"
                  >
                    <span className="font-medium">{wallet}</span>
                    <span className="text-xs text-muted-foreground group-hover:text-accent font-mono">
                      {connecting === wallet ? "connecting" : "→"}
                    </span>
                  </button>
                ))}
              </div>
              {error && (
                <div className="mt-4 flex gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <p className="mt-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-mono text-center">
                Real wallet · {import.meta.env.VITE_SOLANA_CLUSTER ?? "devnet"}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
