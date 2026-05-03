import { create } from "zustand";

export type RiskTier = "Secure" | "Healthy" | "Risk Elevated" | "Critical";

export interface LendingState {
  connected: boolean;
  walletLabel: string | null;
  walletAddress: string | null;
  solBalance: number;

  collateralSol: number;
  borrowedUsdc: number;

  // Market data
  solPrice: number;
  marketStress: number; // 0..1

  // actions
  connect: (label: string, address: string) => void;
  disconnect: () => void;
  setSolBalance: (amount: number) => void;
  deposit: (amount: number) => void;
  withdraw: (amount: number) => void;
  borrow: (amount: number) => void;
  repay: (amount: number) => void;
  setMarketStress: (s: number) => void;
}

export const useLending = create<LendingState>((set, get) => ({
  connected: false,
  walletLabel: null,
  walletAddress: null,
  solBalance: 12.4,

  collateralSol: 0,
  borrowedUsdc: 0,

  solPrice: 168.42,
  marketStress: 0.15,

  connect: (label, address) => set({ connected: true, walletLabel: label, walletAddress: address }),
  disconnect: () =>
    set({
      connected: false,
      walletLabel: null,
      walletAddress: null,
      collateralSol: 0,
      borrowedUsdc: 0,
    }),
  setSolBalance: (solBalance) => set({ solBalance }),

  deposit: (amount) => {
    const s = get();
    if (amount <= 0 || amount > s.solBalance) return;
    set({ solBalance: s.solBalance - amount, collateralSol: s.collateralSol + amount });
  },
  withdraw: (amount) => {
    const s = get();
    if (amount <= 0 || amount > s.collateralSol) return;
    set({ solBalance: s.solBalance + amount, collateralSol: s.collateralSol - amount });
  },
  borrow: (amount) => {
    const s = get();
    if (amount <= 0) return;
    set({ borrowedUsdc: s.borrowedUsdc + amount });
  },
  repay: (amount) => {
    const s = get();
    if (amount <= 0) return;
    set({ borrowedUsdc: Math.max(0, s.borrowedUsdc - amount) });
  },
  setMarketStress: (marketStress) => set({ marketStress }),
}));

// Pure helpers — these conceptually run inside Arcium MPC.
// In the demo we compute locally but treat results as "private outputs".
export function computeRisk(
  collateralSol: number,
  borrowedUsdc: number,
  solPrice: number,
  stress: number,
) {
  const collateralUsd = collateralSol * solPrice * (1 - stress * 0.25);
  // Max LTV dynamic: 0.75 base, reduced by stress
  const maxLtv = 0.75 - stress * 0.15;
  const maxBorrow = collateralUsd * maxLtv;
  const utilization = collateralUsd > 0 ? borrowedUsdc / Math.max(1, collateralUsd) : 0;
  // Health = (collateralUsd * liqThreshold) / borrowed — kept private
  const liqThreshold = 0.83 - stress * 0.1;
  const health = borrowedUsdc > 0 ? (collateralUsd * liqThreshold) / borrowedUsdc : Infinity;

  let tier: RiskTier = "Secure";
  if (borrowedUsdc === 0) tier = "Secure";
  else if (health > 1.8) tier = "Healthy";
  else if (health > 1.25) tier = "Risk Elevated";
  else tier = "Critical";

  return {
    collateralUsd,
    maxBorrow,
    safeBorrow: Math.max(0, maxBorrow - borrowedUsdc),
    utilization,
    health,
    tier,
    maxLtv,
  };
}

export const fmtUsd = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export const fmtSol = (n: number) =>
  `${n.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;
