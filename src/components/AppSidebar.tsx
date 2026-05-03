import { Link, useRouterState } from "@tanstack/react-router";
import { Mark } from "./TopBar";

const items = [
  { to: "/app", label: "Overview" },
  { to: "/app/deposit", label: "Deposit" },
  { to: "/app/borrow", label: "Borrow" },
  { to: "/app/repay", label: "Repay" },
  { to: "/app/liquidation", label: "Liquidation watch" },
  { to: "/app/privacy", label: "Privacy engine" },
  { to: "/app/settings", label: "Settings" },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-sidebar px-5 py-6">
      <Link to="/" className="flex items-center gap-2 mb-10">
        <Mark />
        <span className="font-serif text-lg leading-none">CipherLend</span>
      </Link>

      <div className="label-eyebrow mb-3">Menu</div>
      <nav className="flex-1 -mx-2">
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/app" && path.startsWith(it.to));
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition ${
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${active ? "bg-accent" : "bg-transparent border border-border"}`}
                />
                {it.label}
              </span>
              {active && <span className="font-mono text-[10px] text-accent">●</span>}
            </Link>
          );
        })}
      </nav>

      <div className="rule pt-4 mt-4">
        <div className="label-eyebrow flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-success animate-pulse" />
          Arcium MXE on devnet
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground leading-snug">
          Risk computations are encrypted end-to-end.
        </p>
      </div>
    </aside>
  );
}
