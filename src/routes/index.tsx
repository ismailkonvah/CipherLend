import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CipherLend — Private lending on Solana" },
      {
        name: "description",
        content:
          "A private lending market prototype on Solana. Borrow-risk inputs are encrypted for Arcium MPC so health factors and liquidation thresholds do not need to be public.",
      },
      { property: "og:title", content: "CipherLend — Private lending on Solana" },
      {
        property: "og:description",
        content: "Borrow without surveillance. No public liquidation targeting. No MEV.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen relative">
      <TopBar />

      {/* Ticker */}
      <div className="border-b border-border bg-secondary/40 ticker-strip overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee py-2 text-[11px] font-mono text-muted-foreground">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex shrink-0">
              {[
                "SOL · $168.42 · +2.4%",
                "USDC · borrow APR 4.85%",
                "Arcium MXE · devnet",
                "Encrypted positions · 3,412",
                "Liquidations targeted · 0",
                "Avg LTV · private",
              ].map((t) => (
                <span key={t} className="mx-8">
                  // {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* HERO */}
      <section className="relative">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-20 md:pt-28 pb-20">
          <div className="grid md:grid-cols-12 gap-10 items-end">
            <div className="md:col-span-8">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="label-eyebrow"
              >
                Issue 01 — Solana, Q2 2026
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-4 font-serif text-[44px] sm:text-6xl md:text-7xl leading-[1.02] tracking-tight"
              >
                Lending,
                <br />
                <span className="italic">finally</span> private.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed"
              >
                CipherLend is a confidential money market on Solana. Your collateral is public —
                your{" "}
                <em className="font-serif italic text-foreground">
                  health factor, liquidation threshold, and risk score are not
                </em>
                . Built with Arcium MPC.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8 flex flex-wrap items-center gap-4"
              >
                <Link
                  to="/app"
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90 transition"
                >
                  Open the app <ArrowUpRight className="h-4 w-4" />
                </Link>
                <a
                  href="#architecture"
                  className="inline-flex items-center gap-1.5 text-sm border-b border-foreground/30 hover:border-foreground transition"
                >
                  View the architecture
                </a>
              </motion.div>
            </div>

            <motion.aside
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="md:col-span-4"
            >
              <div className="border-l border-border pl-5 space-y-4">
                <Pull n="01" t="No public liquidation targeting." />
                <Pull n="02" t="No MEV searcher front-running." />
                <Pull n="03" t="No wallet fingerprinting." />
              </div>
            </motion.aside>
          </div>
        </div>

        {/* Featured-card "magazine" preview */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 pb-24">
          <div className="border border-border bg-card rounded-xl overflow-hidden">
            <div className="grid md:grid-cols-3">
              <FeatureCell label="Collateral" value="142.3 SOL" sub="$23,985.00 · public" />
              <FeatureCell label="Borrowed" value="$12,400" sub="USDC · public" />
              <FeatureCell
                label="Health factor"
                value="······"
                valueClass="font-mono tracking-[0.25em] text-muted-foreground"
                sub="Encrypted · Arcium"
                accent
              />
            </div>
            <div className="border-t border-border px-6 py-4 flex items-center justify-between text-xs">
              <span className="font-mono text-muted-foreground">
                cipherlend.io / position #4f7a
              </span>
              <span className="inline-flex items-center gap-2 text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Arcium MXE deployed
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <Section eyebrow="The problem" title="Public risk is exploitable risk.">
        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border border-y border-border">
          {[
            {
              n: "01",
              t: "Predatory liquidations",
              d: "Bots scan every wallet and trigger the moment your health drops below threshold. The exact threshold is published.",
            },
            {
              n: "02",
              t: "MEV exploitation",
              d: "Searchers see your position size and front-run your trades, your borrows, your repayments.",
            },
            {
              n: "03",
              t: "Wallet profiling",
              d: "Anyone can reconstruct your strategy and risk appetite from your onchain history. Forever.",
            },
          ].map((p) => (
            <div key={p.n} className="p-6">
              <div className="font-mono text-xs text-muted-foreground">{p.n} —</div>
              <div className="mt-2 font-serif text-2xl">{p.t}</div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{p.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* HOW */}
      <Section id="how" eyebrow="How it works" title="Public assets. Private risk.">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <ol className="divide-y divide-border border-y border-border">
            {[
              {
                i: "01",
                t: "Deposit collateral",
                d: "Your SOL or SPL deposit hits the chain — exactly like any other DeFi protocol.",
              },
              {
                i: "02",
                t: "Risk inputs are encrypted",
                d: "Borrow-risk values are prepared for Arcium MPC verification instead of being published as raw health factors.",
              },
              {
                i: "03",
                t: "Onchain receives outputs",
                d: "The devnet scaffold writes protocol state on Solana while the encrypted approval callback remains the next milestone.",
              },
              {
                i: "04",
                t: "You see a tier, not a number",
                d: "Secure / Healthy / Risk elevated. Reveal exact values privately, in your browser.",
              },
            ].map((s) => (
              <li key={s.i} className="py-5 grid grid-cols-[40px_1fr] gap-4">
                <div className="font-mono text-sm text-accent">{s.i}</div>
                <div>
                  <div className="font-serif text-xl">{s.t}</div>
                  <p className="text-sm text-muted-foreground mt-1">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>

          <div id="architecture" className="border border-border rounded-xl p-6 bg-card">
            <div className="label-eyebrow">Architecture</div>
            <div className="mt-4 space-y-3 font-mono text-xs">
              <Box label="Frontend · Solana wallet" />
              <Arrow />
              <Box label="Anchor program" />
              <Arrow />
              <Box label="Arcium MPC · encrypted risk path" highlight />
              <Arrow note="callback milestone" />
              <Box label="Solana state · position accounting" />
            </div>
          </div>
        </div>
      </Section>

      {/* PRIVACY */}
      <Section id="privacy" eyebrow="What's public, what's private" title="A clear line.">
        <div className="grid md:grid-cols-2 border border-border rounded-xl overflow-hidden">
          <div className="p-8 border-b md:border-b-0 md:border-r border-border">
            <div className="label-eyebrow">Public · onchain</div>
            <ul className="mt-4 divide-y divide-border">
              {[
                "Collateral deposits",
                "Repayments",
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
          <div className="p-8 bg-secondary/40">
            <div className="label-eyebrow text-accent">Encrypted · Arcium</div>
            <ul className="mt-4 divide-y divide-border">
              {[
                "Health factor",
                "Liquidation threshold",
                "Dynamic LTV per position",
                "Risk score & interest",
                "Liquidation eligibility",
              ].map((x) => (
                <li key={x} className="py-2.5 text-sm flex items-center gap-3">
                  <span className="font-mono text-xs text-accent">◆</span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* CTA */}
      <section className="px-4 md:px-6 pb-28">
        <div className="max-w-4xl mx-auto text-center">
          <div className="label-eyebrow">Open the app</div>
          <h2 className="mt-3 font-serif text-4xl md:text-6xl tracking-tight">
            Borrow without being <span className="italic">watched</span>.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-muted-foreground">
            Connect a wallet and try the confidential lending flow in under 30 seconds.
          </p>
          <Link
            to="/app"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-90 transition"
          >
            Launch CipherLend <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="font-mono">© 2026 CipherLend · Private lending on Solana</div>
          <div className="flex gap-5">
            <a href="#architecture" className="hover:text-foreground">
              Architecture
            </a>
            <a href="#" className="hover:text-foreground">
              Docs
            </a>
            <a href="#" className="hover:text-foreground">
              Audit
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({
  children,
  title,
  eyebrow,
  id,
}: {
  children: React.ReactNode;
  title: string;
  eyebrow: string;
  id?: string;
}) {
  return (
    <section id={id} className="px-4 md:px-6 py-20 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 grid md:grid-cols-12 gap-6 items-end">
          <div className="md:col-span-3 label-eyebrow">{eyebrow}</div>
          <h2 className="md:col-span-9 font-serif text-3xl md:text-5xl tracking-tight">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function Pull({ n, t }: { n: string; t: string }) {
  return (
    <div>
      <div className="font-mono text-xs text-accent">{n}</div>
      <div className="font-serif text-xl mt-0.5">{t}</div>
    </div>
  );
}

function FeatureCell({
  label,
  value,
  sub,
  accent,
  valueClass,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  valueClass?: string;
}) {
  return (
    <div
      className={`p-6 md:p-8 border-b md:border-b-0 md:border-r last:border-r-0 border-border ${accent ? "bg-secondary/40" : ""}`}
    >
      <div className="label-eyebrow">{label}</div>
      <div
        className={`mt-3 font-serif text-4xl md:text-5xl tracking-tight num ${valueClass ?? ""}`}
      >
        {value}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function Box({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <div
      className={`px-3 py-2 border ${highlight ? "border-accent bg-accent/10 text-foreground" : "border-border bg-background"}`}
    >
      {label}
    </div>
  );
}
function Arrow({ note }: { note?: string }) {
  return (
    <div className="flex items-center gap-2 pl-3 text-muted-foreground">
      <span>↓</span>
      {note && <span className="text-[10px] uppercase tracking-[0.15em]">{note}</span>}
    </div>
  );
}
