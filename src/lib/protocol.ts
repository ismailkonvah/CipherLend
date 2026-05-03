export const CIPHERLEND_PROGRAM_ID = import.meta.env.VITE_CIPHERLEND_PROGRAM_ID as
  | string
  | undefined;
export const ARCIUM_MXE_PUBLIC_KEY = import.meta.env.VITE_ARCIUM_MXE_PUBLIC_KEY as
  | string
  | undefined;
export const ARCIUM_CLUSTER_OFFSET = Number(import.meta.env.VITE_ARCIUM_CLUSTER_OFFSET ?? 0);

export const protocolConfigured = Boolean(CIPHERLEND_PROGRAM_ID && ARCIUM_MXE_PUBLIC_KEY);

export function missingProtocolMessage(action: string) {
  return `${action} needs a deployed CipherLend Solana program and Arcium MXE configuration. Set VITE_CIPHERLEND_PROGRAM_ID and VITE_ARCIUM_MXE_PUBLIC_KEY to enable real transactions.`;
}
