// The active Arcium/Arcis borrow-risk circuit lives in:
//
//     protocol/encrypted-ixs/src/lib.rs
//
// `arcium build` compiles that crate into `build/verify_borrow_eligibility.arcis`
// and generates the Anchor callback types consumed by `programs/cipherlend/src/lib.rs`.
