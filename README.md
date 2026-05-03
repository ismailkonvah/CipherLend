# CipherLend

CipherLend is a privacy-preserving lending prototype on Solana. It demonstrates how a lending market can keep liquidation-sensitive risk data out of public bot-readable state while still settling deposits and protocol state onchain.

The project was built for the private lending and borrowing track: public DeFi lending exposes collateral, borrows, health factors, and liquidation thresholds. CipherLend uses Arcium as the confidential-computation layer for the borrow-risk path, so position risk can be encrypted for MPC verification instead of published as raw health-factor data.

## What Works Today

- Solana wallet connection for Phantom, Backpack, and Solflare.
- Devnet SOL balance reads through RPC.
- Real devnet program deployment.
- Real SOL collateral deposits into a deterministic vault PDA.
- Position PDA creation and collateral accounting.
- Borrow request serialization with encrypted risk inputs.
- Arcium MXE deployed and initialized on devnet.
- UI flows for deposit, borrow request, repay, liquidation watch, and privacy explanation.

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
3. The encrypted payload is submitted with the borrow request instruction.
4. The intended protocol path is for Arcium MPC to evaluate health factor, dynamic LTV, liquidation threshold, and risk tier without exposing those values publicly.

In the current devnet build, the MXE is deployed and the client-side encryption path is wired. The full encrypted instruction callback that finalizes borrow approval is the next protocol milestone.

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
- `protocol/programs/cipherlend/src/circuits/risk.rs` - draft confidential risk circuit

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

## Current Limitations

CipherLend is a devnet prototype, not production lending infrastructure.

- The deposit path moves real devnet SOL into a vault PDA.
- Borrow requests encrypt risk inputs and submit protocol state, but the final Arcium callback that approves and settles a borrow is still the next milestone.
- The repayment path updates accounting state; tokenized USDC minting/transfer settlement is not implemented.
- The risk circuit exists as a draft in `protocol/programs/cipherlend/src/circuits/risk.rs`.
- No audit has been performed.

## Why It Matters

Public liquidation data creates an unfair market where bots can target borrowers before borrowers can react. CipherLend explores a different model: public settlement with private risk evaluation. If completed, this design can reduce liquidation targeting, strategy copying, and MEV around lending positions while preserving Solana's fast settlement UX.
