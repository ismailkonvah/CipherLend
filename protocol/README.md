# CipherLend Protocol

This directory contains the Anchor/Arcium protocol workspace for CipherLend.

## Current Devnet Program

- Program ID: `4fT2QQh5sWPZ1bpHrcxRp7urQ5zSJoXiXuMKeCQqoXW7`
- Cluster: Solana devnet
- Arcium cluster offset: `456`

## What Exists

- `programs/cipherlend/src/lib.rs`: Anchor program with market, position, deposit, borrow request, and repay instructions.
- `deposit_collateral`: transfers real devnet SOL into a deterministic vault PDA and updates the position account.
- `request_borrow`: accepts encrypted risk inputs and stores pending borrow state.
- `programs/cipherlend/src/circuits/risk.rs`: draft Arcium/Arcis confidential risk circuit.
- `Anchor.toml`: devnet workspace config pinned to Anchor `0.31.1`.

## Build

Use WSL2 Ubuntu for Arcium tooling.

```bash
arcium build
```

Confirm the generated IDL contains the vault PDA account:

```bash
grep -n "vault" target/idl/cipherlend.json
```

## Deploy / Upgrade

```bash
arcium deploy --cluster-offset 456 --recovery-set-size 4 --keypair-path ~/.config/solana/id.json --rpc-url https://api.devnet.solana.com --resume
```

## Arcium Design Notes

- The frontend encrypts borrow-risk inputs against the configured MXE X25519 public key.
- The intended MPC circuit evaluates health factor, dynamic LTV, liquidation threshold, and risk tier without publishing raw values.
- The current devnet build has the MXE deployed and encrypted input path wired.
- The final encrypted instruction callback that approves and settles borrows is the next protocol milestone.

## Public vs Private

Public on Solana:

- collateral deposits
- vault balances
- repayments
- minimal position accounting

Designed for Arcium/private path:

- exact health factor
- dynamic LTV
- liquidation threshold
- risk tier
- liquidation eligibility
