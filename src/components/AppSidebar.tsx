import { Link, useRouterState } from "@tanstack/react-router";
import { Mark } from "./TopBar";

const items = [
  { to: "/app", label: "Overview" },
  { to: "/app/deposit", label: "Deposit" },
  { to: "/app/borrow", label: "Borrow" },
  { to: "/app/repay", label: "Repay" },
  { to: "/app/liquidation", label: "Liquidation" },
  { to: "/app/privacy", label: "Privacy engine" },
  { to: "/app/settings", label: "Settings" },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  const renderItem = (it: (typeof items)[number], mobile = false) => {
    const active = path === it.to || (it.to !== "/app" && path.startsWith(it.to));
    if (mobile) {
      return (
        <Link
          key={it.to}
          to={it.to}
          className={`flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-[10px] transition ${
            active ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-accent" : "bg-border"}`} />
          <span className="max-w-full truncate text-center leading-tight">{it.label}</span>
        </Link>
      );
    }

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
            className={`h-1.5 w-1.5 rounded-full ${
              active ? "bg-accent" : "bg-transparent border border-border"
            }`}
          />
          {it.label}
        </span>
        {active && <span className="font-mono text-[10px] text-accent">●</span>}
      </Link>
    );
  };

  return (
    <>
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-sidebar px-5 py-6 md:flex">
        <Link to="/" className="mb-10 flex items-center gap-2">
          <Mark />
          <span className="font-serif text-lg leading-none">CipherLend</span>
        </Link>

        <div className="label-eyebrow mb-3">Menu</div>
        <nav className="flex-1 -mx-2">{items.map((it) => renderItem(it))}</nav>

        <div className="rule mt-4 pt-4">
          <div className="label-eyebrow flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-success animate-pulse" />
            Arcium MXE on devnet
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground leading-snug">
            Risk computations are encrypted end-to-end.
          </p>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_oklch(0.21_0.03_255_/_0.08)] backdrop-blur-md md:hidden">
        {items.slice(0, 5).map((it) => renderItem(it, true))}
      </nav>
    </>
  );
}
