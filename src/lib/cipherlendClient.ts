import "./nodeGlobals";

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { CIPHERLEND_PROGRAM_ID, ARCIUM_MXE_PUBLIC_KEY, protocolConfigured } from "./protocol";
import { encryptBorrowRiskInputs, type EncryptedBorrowRiskInputs } from "./arcium";
import { SOLANA_RPC_URL, getWalletProvider, type InjectedSolanaWallet } from "./solana";

export type CipherLendAction = "deposit" | "withdraw" | "borrow" | "repay";

export type ProtocolTxRequest =
  | { action: "deposit"; owner: string; lamports: bigint }
  | { action: "withdraw"; owner: string; lamports: bigint }
  | {
      action: "borrow";
      owner: string;
      amountUsdc: bigint;
      collateralLamports: bigint;
      borrowedUsdc: bigint;
      solPriceMicroUsd: bigint;
      marketStressBps: bigint;
    }
  | { action: "repay"; owner: string; amountUsdc: bigint };

export type ProtocolTxResult = {
  signature?: string;
  encryptedRiskInputs?: EncryptedBorrowRiskInputs;
};

export type ProtocolPosition = {
  collateralLamports: bigint;
  borrowedUsdc: bigint;
  pendingBorrowUsdc: bigint;
};

const POSITION_SEED = "position";
const VAULT_SEED = "vault";
const SIGN_PDA_SEED = "ArciumSignerAccount";

const IX = {
  depositCollateral: [156, 131, 142, 116, 146, 247, 162, 120],
  openPosition: [135, 128, 47, 77, 15, 152, 240, 49],
  repay: [234, 103, 67, 82, 208, 234, 219, 166],
  requestBorrow: [2, 237, 170, 85, 100, 157, 146, 191],
  withdrawCollateral: [115, 135, 168, 106, 139, 214, 138, 150],
} as const;

function u64Le(value: bigint) {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, value, true);
  return bytes;
}

function u128Le(value: bigint) {
  const bytes = new Uint8Array(16);
  let remaining = value;
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return bytes;
}

function fixedBytes(values: number[], length: number, label: string) {
  if (values.length !== length) {
    throw new Error(`${label} must be ${length} bytes, got ${values.length}.`);
  }
  return Uint8Array.from(values);
}

function data(discriminator: readonly number[], ...parts: Uint8Array[]) {
  const size = discriminator.length + parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  out.set(discriminator, 0);
  let offset = discriminator.length;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  if (!globalThis.Buffer) {
    throw new Error("Browser Buffer polyfill is not ready. Refresh the page and try again.");
  }

  return globalThis.Buffer.from(out);
}

const textEncoder = new TextEncoder();

function getConnectedProvider(owner: string): InjectedSolanaWallet {
  for (const wallet of ["Phantom", "Backpack", "Solflare"] as const) {
    const provider = getWalletProvider(wallet);
    if (provider?.publicKey?.toString() === owner) return provider;
  }

  throw new Error("Connected wallet provider was not found. Reconnect your wallet and try again.");
}

function formatTransactionError(error: unknown) {
  if (error instanceof Error) {
    const maybeLogs = error as Error & { logs?: string[]; getLogs?: () => string[] };
    const logs = maybeLogs.logs ?? maybeLogs.getLogs?.();
    if (logs?.length) {
      return `${error.message}\n${logs.slice(-8).join("\n")}`;
    }
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const record = error as { message?: unknown; logs?: unknown };
    const message = typeof record.message === "string" ? record.message : "Transaction failed.";
    const logs = Array.isArray(record.logs) ? record.logs.filter((log) => typeof log === "string") : [];
    return logs.length ? `${message}\n${logs.slice(-8).join("\n")}` : message;
  }

  return "Transaction failed.";
}

async function signAndSend(
  connection: Connection,
  provider: InjectedSolanaWallet,
  owner: PublicKey,
  transaction: Transaction,
) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  transaction.feePayer = owner;
  transaction.recentBlockhash = blockhash;

  try {
    if (provider.signTransaction) {
      const signed = await provider.signTransaction(transaction);
      const signedSignature = signed.signature ? bs58.encode(signed.signature) : undefined;
      let signature: string;
      try {
        signature = await connection.sendRawTransaction(signed.serialize(), {
          preflightCommitment: "confirmed",
        });
      } catch (error) {
        const message = formatTransactionError(error);
        if (signedSignature && message.toLowerCase().includes("already been processed")) {
          signature = signedSignature;
        } else {
          throw error;
        }
      }
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
      return signature;
    }

    if (provider.signAndSendTransaction) {
      const { signature } = await provider.signAndSendTransaction(transaction);
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed",
      );
      return signature;
    }
  } catch (error) {
    throw new Error(formatTransactionError(error));
  }

  throw new Error("Connected wallet cannot sign Solana transactions.");
}

export class CipherLendClient {
  readonly programId = CIPHERLEND_PROGRAM_ID;
  readonly arciumMxe = ARCIUM_MXE_PUBLIC_KEY;
  private readonly connection = new Connection(SOLANA_RPC_URL, "confirmed");

  get configured() {
    return protocolConfigured;
  }

  getPositionAddress(ownerAddress: string) {
    if (!CIPHERLEND_PROGRAM_ID) {
      throw new Error("Missing VITE_CIPHERLEND_PROGRAM_ID.");
    }

    const programId = new PublicKey(CIPHERLEND_PROGRAM_ID);
    const owner = new PublicKey(ownerAddress);
    return PublicKey.findProgramAddressSync(
      [textEncoder.encode(POSITION_SEED), owner.toBuffer()],
      programId,
    )[0];
  }

  async getPosition(ownerAddress: string): Promise<ProtocolPosition | null> {
    if (!this.configured) return null;

    const position = this.getPositionAddress(ownerAddress);
    const account = await this.connection.getAccountInfo(position, "confirmed");
    if (!account) return null;

    const dataView = new DataView(
      account.data.buffer,
      account.data.byteOffset,
      account.data.byteLength,
    );

    return {
      collateralLamports: dataView.getBigUint64(40, true),
      borrowedUsdc: dataView.getBigUint64(48, true),
      pendingBorrowUsdc: dataView.getBigUint64(56, true),
    };
  }

  async submit(request: ProtocolTxRequest): Promise<ProtocolTxResult> {
    if (typeof window !== "undefined" && !globalThis.Buffer) {
      const { Buffer } = await import("buffer");
      globalThis.Buffer = Buffer;
    }

    if (!this.configured) {
      throw new Error(
        "CipherLend protocol is not configured. Deploy the program and set VITE_CIPHERLEND_PROGRAM_ID plus VITE_ARCIUM_MXE_PUBLIC_KEY.",
      );
    }

    if (!CIPHERLEND_PROGRAM_ID) {
      throw new Error("Missing VITE_CIPHERLEND_PROGRAM_ID.");
    }

    const programId = new PublicKey(CIPHERLEND_PROGRAM_ID);
    const owner = new PublicKey(request.owner);
    const provider = getConnectedProvider(request.owner);
    const [position] = PublicKey.findProgramAddressSync(
      [textEncoder.encode(POSITION_SEED), owner.toBuffer()],
      programId,
    );
    const [vault] = PublicKey.findProgramAddressSync(
      [textEncoder.encode(VAULT_SEED), owner.toBuffer()],
      programId,
    );
    const [signPdaAccount] = PublicKey.findProgramAddressSync(
      [textEncoder.encode(SIGN_PDA_SEED)],
      programId,
    );
    const transaction = new Transaction();
    const positionExists = await this.connection.getAccountInfo(position, "confirmed");

    if (!positionExists) {
      transaction.add(
        new TransactionInstruction({
          programId,
          keys: [
            { pubkey: owner, isSigner: true, isWritable: true },
            { pubkey: position, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: data(IX.openPosition),
        }),
      );
    }

    if (request.action === "deposit") {
      transaction.add(
        new TransactionInstruction({
          programId,
          keys: [
            { pubkey: owner, isSigner: true, isWritable: true },
            { pubkey: position, isSigner: false, isWritable: true },
            { pubkey: vault, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: data(IX.depositCollateral, u64Le(request.lamports)),
        }),
      );

      const signature = await signAndSend(this.connection, provider, owner, transaction);
      return { signature };
    }

    if (request.action === "withdraw") {
      transaction.add(
        new TransactionInstruction({
          programId,
          keys: [
            { pubkey: owner, isSigner: true, isWritable: true },
            { pubkey: position, isSigner: false, isWritable: true },
            { pubkey: vault, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: data(IX.withdrawCollateral, u64Le(request.lamports)),
        }),
      );

      const signature = await signAndSend(this.connection, provider, owner, transaction);
      return { signature };
    }

    if (request.action === "repay") {
      transaction.add(
        new TransactionInstruction({
          programId,
          keys: [
            { pubkey: owner, isSigner: true, isWritable: true },
            { pubkey: position, isSigner: false, isWritable: true },
          ],
          data: data(IX.repay, u64Le(request.amountUsdc)),
        }),
      );

      const signature = await signAndSend(this.connection, provider, owner, transaction);
      return { signature };
    }

    if (request.action === "borrow") {
      const encryptedRiskInputs = encryptBorrowRiskInputs({
        collateralLamports: request.collateralLamports,
        borrowedUsdc: request.borrowedUsdc,
        requestedUsdc: request.amountUsdc,
        solPriceMicroUsd: request.solPriceMicroUsd,
        marketStressBps: request.marketStressBps,
      });

      transaction.add(
        new TransactionInstruction({
          programId,
          keys: [
            { pubkey: owner, isSigner: true, isWritable: true },
            { pubkey: position, isSigner: false, isWritable: true },
            { pubkey: signPdaAccount, isSigner: false, isWritable: true },
            { pubkey: new PublicKey(encryptedRiskInputs.mxeAccount), isSigner: false, isWritable: false },
            { pubkey: new PublicKey(encryptedRiskInputs.mempoolAccount), isSigner: false, isWritable: true },
            { pubkey: new PublicKey(encryptedRiskInputs.executingPool), isSigner: false, isWritable: true },
            { pubkey: new PublicKey(encryptedRiskInputs.computationAccount), isSigner: false, isWritable: true },
            { pubkey: new PublicKey(encryptedRiskInputs.compDefAccount), isSigner: false, isWritable: false },
            { pubkey: new PublicKey(encryptedRiskInputs.clusterAccount), isSigner: false, isWritable: true },
            { pubkey: new PublicKey(encryptedRiskInputs.poolAccount), isSigner: false, isWritable: true },
            { pubkey: new PublicKey(encryptedRiskInputs.clockAccount), isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: new PublicKey(encryptedRiskInputs.arciumProgram), isSigner: false, isWritable: false },
          ],
          data: data(
            IX.requestBorrow,
            u64Le(BigInt(encryptedRiskInputs.computationOffset)),
            u64Le(request.amountUsdc),
            fixedBytes(encryptedRiskInputs.ciphertexts[0] ?? [], 32, "collateral ciphertext"),
            fixedBytes(encryptedRiskInputs.ciphertexts[1] ?? [], 32, "borrowed USDC ciphertext"),
            fixedBytes(encryptedRiskInputs.ciphertexts[2] ?? [], 32, "requested USDC ciphertext"),
            fixedBytes(encryptedRiskInputs.ciphertexts[3] ?? [], 32, "SOL price ciphertext"),
            fixedBytes(encryptedRiskInputs.ciphertexts[4] ?? [], 32, "market stress ciphertext"),
            fixedBytes(encryptedRiskInputs.clientPublicKey, 32, "client public key"),
            u128Le(encryptedRiskInputs.nonce),
          ),
        }),
      );

      const signature = await signAndSend(this.connection, provider, owner, transaction);
      return { signature, encryptedRiskInputs };
    }

    throw new Error("Unsupported CipherLend action.");
  }
}

export const cipherLendClient = new CipherLendClient();
