import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, X, Eye, EyeOff } from "lucide-react";

type Row = { label: string; example: string; visibility: "offchain" | "onchain" };

const rows: Row[] = [
  { label: "Wallet address", example: "8xK4…9pQ2", visibility: "onchain" },
  { label: "Collateral deposit", example: "12.4 SOL", visibility: "onchain" },
  { label: "Borrowed amount", example: "$1,200 USDC", visibility: "onchain" },
  { label: "Health factor", example: "1.84", visibility: "offchain" },
  { label: "Liquidation threshold", example: "0.83", visibility: "offchain" },
  { label: "Max LTV (your tier)", example: "0.75", visibility: "offchain" },
  { label: "Risk score / tier", example: "Healthy", visibility: "offchain" },
  { label: "MPC approval flag", example: "✓ verified", visibility: "onchain" },
];

const flow = [
  {
    n: "01",
    title: "Inputs encrypted client-side",
    body: "Your position parameters never leave your machine in cleartext.",
  },
  {
    n: "02",
    title: "Arcium MPC verification path",
    body: "The prototype encrypts risk inputs for MPC evaluation so no single node would need to see the data in cleartext.",
  },
  {
    n: "03",
    title: "Minimal output published",
    body: "The intended callback publishes only the approval result and public settlement data.",
  },
];

export function PrivacyExplainerTrigger({
  className = "",
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition ${className}`}
      >
        <Shield className="h-3 w-3" />
        {children ?? "What's private?"}
      </button>
      <PrivacyExplainerModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function PrivacyExplainerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ y: 12, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-card border border-border shadow-2xl"
          >
            <div className="flex items-start justify-between p-6 border-b border-border">
              <div>
                <div className="label-eyebrow">Privacy architecture</div>
                <h2 className="font-serif text-3xl mt-1 tracking-tight">
                  What's <em>private</em>, what's onchain.
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 border-b border-border">
              <div className="label-eyebrow mb-4">Compute flow</div>
              <ol className="space-y-4">
                {flow.map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <span className="font-mono text-xs text-muted-foreground pt-0.5 w-6">
                      {s.n}
                    </span>
                    <div className="flex-1 border-l border-border pl-4">
                      <div className="font-medium">{s.title}</div>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Legend
                  icon={<EyeOff className="h-3.5 w-3.5" />}
                  label="Offchain · encrypted"
                  hint="Encrypted for Arcium MPC"
                />
                <Legend
                  icon={<Eye className="h-3.5 w-3.5" />}
                  label="Onchain · public"
                  hint="Settled on Solana"
                />
              </div>

              <div className="border border-border rounded-md divide-y divide-border">
                {rows.map((r) => (
                  <div key={r.label} className="grid grid-cols-12 items-center px-4 py-2.5 text-sm">
                    <span className="col-span-6 font-medium">{r.label}</span>
                    <span className="col-span-3 font-mono text-xs text-muted-foreground">
                      {r.example}
                    </span>
                    <span className="col-span-3 flex justify-end">
                      {r.visibility === "offchain" ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-accent">
                          <EyeOff className="h-3 w-3" /> Offchain
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
                          <Eye className="h-3 w-3" /> Onchain
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-xs text-muted-foreground leading-relaxed">
                The goal is to keep exact health factors and liquidation thresholds out of public
                bot-readable state while publishing only public deposits and minimal approval
                outputs.
              </p>
            </div>

            <div className="p-6 border-t border-border flex justify-end">
              <button
                onClick={onClose}
                className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 transition"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Legend({ icon, label, hint }: { icon: React.ReactNode; label: string; hint: string }) {
  return (
    <div className="border border-border rounded-md p-3">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.12em]">
        {icon}
        {label}
      </div>
      <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>
    </div>
  );
}
