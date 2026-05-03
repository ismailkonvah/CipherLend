export type WalletName = "Phantom" | "Backpack" | "Solflare";

type PublicKeyLike = {
  toString: () => string;
};

export type InjectedSolanaWallet = {
  isPhantom?: boolean;
  isBackpack?: boolean;
  isSolflare?: boolean;
  publicKey?: PublicKeyLike | null;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKeyLike }>;
  disconnect?: () => Promise<void>;
  signTransaction?: <T>(transaction: T) => Promise<T>;
  signAndSendTransaction?: <T>(transaction: T) => Promise<{ signature: string }>;
  on?: (
    event: "connect" | "disconnect" | "accountChanged",
    callback: (...args: unknown[]) => void,
  ) => void;
  off?: (
    event: "connect" | "disconnect" | "accountChanged",
    callback: (...args: unknown[]) => void,
  ) => void;
};

declare global {
  interface Window {
    solana?: InjectedSolanaWallet;
    phantom?: { solana?: InjectedSolanaWallet };
    backpack?: { solana?: InjectedSolanaWallet };
    solflare?: InjectedSolanaWallet;
  }
}

export const SUPPORTED_WALLETS: WalletName[] = ["Phantom", "Backpack", "Solflare"];

export const SOLANA_CLUSTER = import.meta.env.VITE_SOLANA_CLUSTER ?? "devnet";
export const SOLANA_RPC_URL =
  import.meta.env.VITE_SOLANA_RPC_URL ?? `https://api.${SOLANA_CLUSTER}.solana.com`;

export function getWalletProvider(wallet: WalletName): InjectedSolanaWallet | null {
  if (typeof window === "undefined") return null;

  if (wallet === "Phantom") {
    return window.phantom?.solana ?? (window.solana?.isPhantom ? window.solana : null);
  }

  if (wallet === "Backpack") {
    return window.backpack?.solana ?? (window.solana?.isBackpack ? window.solana : null);
  }

  return window.solflare ?? (window.solana?.isSolflare ? window.solana : null);
}

export async function connectWallet(wallet: WalletName) {
  const provider = getWalletProvider(wallet);
  if (!provider) {
    throw new Error(`${wallet} wallet extension was not found.`);
  }

  const result = await provider.connect();
  return {
    provider,
    address: result.publicKey.toString(),
  };
}

export async function disconnectWallet(wallet: WalletName | null) {
  if (!wallet) return;
  const provider = getWalletProvider(wallet);
  await provider?.disconnect?.();
}

async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const response = await fetch(SOLANA_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "cipherlend",
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`Solana RPC request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as { result?: T; error?: { message: string } };
  if (payload.error) throw new Error(payload.error.message);
  if (payload.result === undefined) throw new Error("Solana RPC returned no result.");
  return payload.result;
}

export async function getSolBalance(address: string) {
  const result = await rpc<{ value: number }>("getBalance", [address]);
  return result.value / 1_000_000_000;
}

export function shortAddress(address: string) {
  return `${address.slice(0, 4)}..${address.slice(-4)}`;
}
