import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useLending } from "@/lib/store";

export type OnboardingStep = "connect" | "deposit" | "borrow";

const steps: { id: OnboardingStep; label: string; to: string; helper: string }[] = [
  {
    id: "connect",
    label: "Connect wallet",
    to: "/app",
    helper: "Your keys stay in your wallet. CipherLend never custodies funds.",
  },
  {
    id: "deposit",
    label: "Deposit collateral",
    to: "/app/deposit",
    helper: "Collateral is publicly verifiable onchain — your risk profile is not.",
  },
  {
    id: "borrow",
    label: "Borrow privately",
    to: "/app/borrow",
    helper: "Borrow-risk inputs are encrypted for Arcium verification before protocol submission.",
  },
];

function useCurrentStep(): OnboardingStep {
  const { connected, collateralSol, borrowedUsdc } = useLending();
  if (!connected) return "connect";
  if (collateralSol === 0) return "deposit";
  if (borrowedUsdc === 0) return "borrow";
  return "borrow";
}

export function OnboardingStepper({ active }: { active?: OnboardingStep }) {
  const current = useCurrentStep();
  const focus = active ?? current;
  const order: OnboardingStep[] = ["connect", "deposit", "borrow"];
  const focusIdx = order.indexOf(focus);
  const currentIdx = order.indexOf(current);

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="grid grid-cols-3 divide-x divide-border">
        {steps.map((s, i) => {
          const done = i < currentIdx;
          const isFocus = i === focusIdx;
          const isCurrent = i === currentIdx;
          return (
            <Link
              key={s.id}
              to={s.to}
              className={`group p-4 md:p-5 transition relative ${
                isFocus ? "bg-secondary" : "hover:bg-secondary/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-6 w-6 rounded-full grid place-items-center text-[11px] font-mono border transition ${
                    done
                      ? "bg-foreground text-background border-foreground"
                      : isCurrent
                        ? "border-foreground text-foreground"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-3 w-3" /> : `0${i + 1}`}
                </span>
                <span
                  className={`text-sm font-medium ${
                    done || isCurrent ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {isFocus && (
                <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{s.helper}</p>
              )}
              {isCurrent && !done && (
                <span className="absolute left-0 top-0 h-full w-[2px] bg-accent" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
