import { Link } from "@tanstack/react-router";
import { ConnectWallet } from "./ConnectWallet";
import { PrivacyExplainerTrigger } from "./PrivacyExplainer";

export function TopBar({ inApp = false }: { inApp?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div
        className={`${inApp ? "px-4 md:px-6" : "max-w-6xl mx-auto px-4 md:px-6"} h-14 flex items-center justify-between`}
      >
        <Link to="/" className="flex items-center gap-2">
          <Mark />
          <span className="font-serif text-lg leading-none">CipherLend</span>
          <span className="hidden sm:inline-block label-eyebrow ml-2 mt-0.5">
            v0.1 · private beta
          </span>
        </Link>

        <div className="flex items-center gap-5">
          <PrivacyExplainerTrigger className="hidden sm:inline-flex" />
          {!inApp && (
            <nav className="hidden md:flex items-center gap-5 text-sm text-muted-foreground">
              <a href="#how" className="hover:text-foreground transition">
                How it works
              </a>
              <a href="#privacy" className="hover:text-foreground transition">
                Privacy
              </a>
              <a href="#architecture" className="hover:text-foreground transition">
                Architecture
              </a>
              <Link to="/app" className="hover:text-foreground transition">
                Open app
              </Link>
            </nav>
          )}
          <ConnectWallet variant={inApp ? "default" : "compact"} />
        </div>
      </div>
    </header>
  );
}

export function Mark() {
  return (
    <div className="relative h-6 w-6 grid place-items-center">
      <div className="h-5 w-5 rounded-full border-[1.5px] border-foreground" />
      <div className="absolute h-1.5 w-1.5 rounded-full bg-accent" />
    </div>
  );
}
