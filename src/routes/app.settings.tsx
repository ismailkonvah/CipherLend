import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./app.deposit";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="w-full max-w-2xl space-y-6">
      <PageHeader eyebrow="System" title="Settings" sub="Preferences for confidential lending." />

      <section className="border border-border rounded-xl bg-card divide-y divide-border">
        <Toggle
          label="Hide health factor by default"
          desc="Always show risk tier instead of exact value."
          defaultChecked
        />
        <Toggle
          label="Local-only reveal"
          desc="Decrypt private values in your browser only — never log them."
          defaultChecked
        />
        <Toggle
          label="Privacy notifications"
          desc="Notify when encrypted liquidation eligibility changes are available."
        />
      </section>

      <section className="border border-border rounded-xl bg-card p-6">
        <div className="label-eyebrow">Colophon</div>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          CipherLend is a privacy-preserving lending protocol on Solana powered by Arcium
          confidential computation. Open source — built for the next generation of DeFi users.
        </p>
      </section>
    </div>
  );
}

function Toggle({
  label,
  desc,
  defaultChecked,
}: {
  label: string;
  desc: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer p-5">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
      <input type="checkbox" defaultChecked={defaultChecked} className="peer sr-only" />
      <div className="relative h-6 w-11 rounded-full bg-secondary border border-border peer-checked:bg-foreground peer-checked:border-foreground transition shrink-0">
        <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-background border border-border transition peer-checked:translate-x-5" />
      </div>
    </label>
  );
}
