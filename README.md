# CipherLend

CipherLend is a privacy-preserving lending prototype on Solana. It demonstrates how a lending market can keep liquidation-sensitive risk data out of public bot-readable state while still settling deposits and protocol state onchain.

The project was built for the private lending and borrowing track: public DeFi lending exposes collateral, borrows, health factors, and liquidation thresholds. CipherLend uses Arcium as the confidential-computation layer for the borrow-risk path, so position risk can be encrypted for MPC verification instead of published as raw health-factor data.

## What Works Today

- Solana wallet connection for Phantom, Backpack, and Solflare.
- Devnet SOL balance reads through RPC.
- Real devnet program deployment.
- Real SOL collateral deposits into a deterministic vault PDA.
- Position PDA creation and collateral accounting.
- Borrow request serialization with encrypted risk inputs and Arcium queue accounts.
- Arcium encrypted borrow-risk circuit generated from `protocol/encrypted-ixs`.
- Arcium callback settlement code that verifies signed computation output and only moves pending debt into active debt when approved.
- Pending Arcium settlement tracking in the app, so users can see when a borrow request is waiting for confidential settlement.
- Arcium MXE deployed and initialized on devnet.
- UI flows for deposit, borrow request, repay, liquidation watch, and privacy explanation.
- Responsive app shell with desktop sidebar and mobile bottom navigation.

## Devnet Deployment

- Solana program: `4fT2QQh5sWPZ1bpHrcxRp7urQ5zSJoXiXuMKeCQqoXW7`
- Cluster: Solana devnet
- Arcium cluster offset: `456`
- MXE X25519 public key:

```text
[79,104,64,1,96,40,224,163,130,150,201,36,119,134,20,46,42,183,141,243,12,159,221,201,93,166,226,20,88,236,32,95]
```

## How Arcium Is Used

CipherLend uses Arcium in the borrow-risk path:

1. The frontend prepares private borrow-risk inputs, including collateral amount, existing debt, requested borrow amount, SOL price, and market stress.
2. Those inputs are encrypted client-side using the configured Arcium MXE public key.
3. The encrypted payload is submitted to the Solana program with the Arcium computation, mempool, execution-pool, cluster, fee-pool, and computation-definition accounts.
4. The program queues the `verify_borrow_eligibility` encrypted computation in Arcium.
5. Arcium MPC evaluates dynamic LTV and risk tier without exposing the private inputs.
6. While the computation is outstanding, the app shows the borrow as pending Arcium settlement instead of pretending it is already active debt.
7. The Arcium callback verifies `SignedComputationOutputs` and settles the borrow by moving `pending_borrow_usdc` into `borrowed_usdc` only if the computation approves it.

The deployed devnet prototype includes the queue-and-callback path, plus UI handling for pending settlement, duplicate borrow prevention, repay, and vault withdraw guards.

## Privacy Benefits

Traditional onchain lending makes liquidation-sensitive values easy to scrape:

- exact health factor
- liquidation threshold
- risk tier
- position-level borrow capacity
- liquidation eligibility

CipherLend's design keeps those values in an encrypted risk path. Public Solana state only needs to show settlement facts such as deposits, repayments, and minimal approval outputs.

## Architecture

```text
React/TanStack frontend
        |
        v
Solana wallet adapter surface
        |
        v
Anchor program on Solana devnet
        |
        +-- Position PDA
        +-- SOL vault PDA
        |
        v
Arcium MXE / encrypted borrow-risk path
```

Important files:

- `src/lib/cipherlendClient.ts` - frontend transaction serialization and encrypted borrow request path
- `src/lib/arcium.ts` - Arcium encryption helpers and computation account derivation
- `src/lib/solana.ts` - wallet detection and Solana RPC helpers
- `protocol/programs/cipherlend/src/lib.rs` - Anchor program
- `protocol/encrypted-ixs/src/lib.rs` - Arcium confidential borrow-risk circuit
- `protocol/Arcium.toml` - localnet and devnet Arcium cluster configuration

## Run The Frontend

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Run locally:

```bash
npm run dev
```

Then open the printed localhost URL and connect a Solana wallet set to devnet.

## Build The Frontend

```bash
npm run build
npm run lint
```

The current lint output has only Fast Refresh warnings from shared UI component exports.

## Build And Deploy The Protocol

The Arcium CLI is not currently supported directly on Windows. Use WSL2 Ubuntu.

From WSL:

```bash
cd "/mnt/c/Users/user/Documents/secure-lend-vault-main/Cipher Lend/protocol"
arcium build
arcium deploy --cluster-offset 456 --recovery-set-size 4 --keypair-path ~/.config/solana/id.json --rpc-url https://api.devnet.solana.com --resume
```

Check the generated IDL includes the vault account:

```bash
grep -n "vault" target/idl/cipherlend.json
```

After deployment, initialize and upload the borrow-risk computation definition if needed. The Arcium template flow uses the generated `build/verify_borrow_eligibility.arcis` artifact and the `init_verify_borrow_eligibility_comp_def` instruction before encrypted borrow requests can finalize.

The helper script uploads the generated computation definition:

```bash
cd "/mnt/c/Users/user/Documents/secure-lend-vault-main/Cipher Lend"
ARCIUM_UPLOAD_CHUNK_SIZE=10 npm run init:borrow-comp-def
```

## Current Limitations

CipherLend is a devnet prototype, not production lending infrastructure.

- The deposit path moves real devnet SOL into a vault PDA.
- The borrow path queues a real Arcium encrypted computation and tracks pending settlement onchain.
- The repayment path updates protocol accounting state; tokenized USDC minting/transfer settlement is not implemented.
- Pending borrows are represented as protocol accounting state until the Arcium callback settles them into active borrowed debt.
- The risk model is intentionally simple for the prototype: dynamic LTV from encrypted collateral, debt, requested borrow, SOL price, and market stress.
- No audit has been performed.

## Why It Matters

Public liquidation data creates an unfair market where bots can target borrowers before borrowers can react. CipherLend explores a different model: public settlement with private risk evaluation. If completed, this design can reduce liquidation targeting, strategy copying, and MEV around lending positions while preserving Solana's fast settlement UX.
