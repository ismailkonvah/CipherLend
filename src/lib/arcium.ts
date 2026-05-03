import "./nodeGlobals";

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  getCompDefAccAddress,
  getCompDefAccOffset,
  getComputationAccAddress,
  RescueCipher,
  x25519,
} from "@arcium-hq/client";
import { ARCIUM_CLUSTER_OFFSET, ARCIUM_MXE_PUBLIC_KEY, CIPHERLEND_PROGRAM_ID } from "./protocol";

export type BorrowRiskPlaintext = {
  collateralLamports: bigint;
  borrowedUsdc: bigint;
  requestedUsdc: bigint;
  solPriceMicroUsd: bigint;
  marketStressBps: bigint;
};

export type EncryptedBorrowRiskInputs = {
  ciphertexts: number[][];
  clientPublicKey: number[];
  nonce: bigint;
  computationOffset: string;
  computationAccount: string;
  compDefOffset: number;
  compDefAccount: string;
};

const BORROW_RISK_CIRCUIT = "verify_borrow_eligibility";

function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToBigIntLe(bytes: Uint8Array) {
  return bytes.reduceRight((acc, byte) => (acc << 8n) + BigInt(byte), 0n);
}

function parseMxeX25519PublicKey(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return new Uint8Array(JSON.parse(trimmed) as number[]);
  }

  const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  if (/^[0-9a-fA-F]{64}$/.test(hex)) {
    return Uint8Array.from(hex.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)));
  }

  const binary = atob(trimmed);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function readU32Le(bytes: Uint8Array) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true);
}

function randomOffset() {
  return new anchor.BN(randomBytes(8), undefined, "le");
}

export function getBorrowRiskAccounts(computationOffset = randomOffset()) {
  if (!CIPHERLEND_PROGRAM_ID) {
    throw new Error("Missing VITE_CIPHERLEND_PROGRAM_ID.");
  }

  const mxeProgramId = new PublicKey(CIPHERLEND_PROGRAM_ID);
  const compDefOffset = readU32Le(getCompDefAccOffset(BORROW_RISK_CIRCUIT));
  const compDefAccount = getCompDefAccAddress(mxeProgramId, compDefOffset).toBase58();
  const computationAccount = getComputationAccAddress(
    ARCIUM_CLUSTER_OFFSET,
    computationOffset,
  ).toBase58();

  return {
    computationOffset,
    computationAccount,
    compDefOffset,
    compDefAccount,
  };
}

export function encryptBorrowRiskInputs(plaintext: BorrowRiskPlaintext): EncryptedBorrowRiskInputs {
  if (!ARCIUM_MXE_PUBLIC_KEY) {
    throw new Error("Missing VITE_ARCIUM_MXE_PUBLIC_KEY.");
  }

  const clientSecretKey = x25519.utils.randomSecretKey();
  const clientPublicKey = x25519.getPublicKey(clientSecretKey);
  const mxePublicKey = parseMxeX25519PublicKey(ARCIUM_MXE_PUBLIC_KEY);
  const sharedSecret = x25519.getSharedSecret(clientSecretKey, mxePublicKey);
  const cipher = new RescueCipher(sharedSecret);
  const nonceBytes = randomBytes(16);
  const ciphertexts = cipher.encrypt(
    [
      plaintext.collateralLamports,
      plaintext.borrowedUsdc,
      plaintext.requestedUsdc,
      plaintext.solPriceMicroUsd,
      plaintext.marketStressBps,
    ],
    nonceBytes,
  );

  const accounts = getBorrowRiskAccounts();

  return {
    ciphertexts,
    clientPublicKey: Array.from(clientPublicKey),
    nonce: bytesToBigIntLe(nonceBytes),
    computationOffset: accounts.computationOffset.toString(),
    computationAccount: accounts.computationAccount,
    compDefOffset: accounts.compDefOffset,
    compDefAccount: accounts.compDefAccount,
  };
}
