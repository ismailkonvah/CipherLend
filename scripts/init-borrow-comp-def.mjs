import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  getArciumAccountBaseSeed,
  getArciumProgram,
  getArciumProgramId,
  getCompDefAccOffset,
  getLookupTableAddress,
  getMXEAccAddress,
  uploadCircuit,
} from "@arcium-hq/client";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const programId = new PublicKey("4fT2QQh5sWPZ1bpHrcxRp7urQ5zSJoXiXuMKeCQqoXW7");
const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const uploadChunkSize = Number(process.env.ARCIUM_UPLOAD_CHUNK_SIZE ?? 10);
const walletPath =
  process.env.ANCHOR_WALLET ?? path.join(os.homedir(), ".config", "solana", "id.json");
const projectRoot = process.cwd();
const idlPath = path.join(projectRoot, "target", "idl", "cipherlend.json");
const circuitPath = path.join(projectRoot, "build", "verify_borrow_eligibility.arcis");

function readKeypair(filePath) {
  const secret = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return anchor.web3.Keypair.fromSecretKey(new Uint8Array(secret));
}

const keypair = readKeypair(walletPath);
const wallet = new anchor.Wallet(keypair);
const connection = new anchor.web3.Connection(rpcUrl, "confirmed");
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
  preflightCommitment: "confirmed",
});
anchor.setProvider(provider);

const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
const program = new anchor.Program(idl, provider);
const arciumProgram = getArciumProgram(provider);

const offset = getCompDefAccOffset("verify_borrow_eligibility");
const compDefAccount = PublicKey.findProgramAddressSync(
  [getArciumAccountBaseSeed("ComputationDefinitionAccount"), programId.toBuffer(), offset],
  getArciumProgramId(),
)[0];
const mxeAccount = getMXEAccAddress(programId);

const existing = await connection.getAccountInfo(compDefAccount, "confirmed");
if (!existing) {
  const mxeAcc = await arciumProgram.account.mxeAccount.fetch(mxeAccount);
  const addressLookupTable = getLookupTableAddress(programId, mxeAcc.lutOffsetSlot);
  const signature = await program.methods
    .initVerifyBorrowEligibilityCompDef()
    .accounts({
      payer: keypair.publicKey,
      mxeAccount,
      compDefAccount,
      addressLookupTable,
    })
    .signers([keypair])
    .rpc({ commitment: "confirmed" });
  console.log("Initialized verify_borrow_eligibility comp def:", signature);
} else {
  console.log("verify_borrow_eligibility comp def already exists:", compDefAccount.toBase58());
}

const rawCircuit = fs.readFileSync(circuitPath);
const uploadSignature = await uploadCircuit(
  provider,
  "verify_borrow_eligibility",
  programId,
  rawCircuit,
  true,
  uploadChunkSize,
  {
    skipPreflight: true,
    preflightCommitment: "confirmed",
    commitment: "confirmed",
  },
);
console.log("Uploaded verify_borrow_eligibility circuit:", uploadSignature);
