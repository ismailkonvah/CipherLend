use anchor_lang::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;
use arcium_anchor::prelude::*;

declare_id!("4fT2QQh5sWPZ1bpHrcxRp7urQ5zSJoXiXuMKeCQqoXW7");

pub mod circuits;

const COMP_DEF_OFFSET_VERIFY_BORROW_ELIGIBILITY: u32 =
    comp_def_offset("verify_borrow_eligibility");

#[arcium_program]
pub mod cipherlend {
    use super::*;

    pub fn init_verify_borrow_eligibility_comp_def(
        ctx: Context<InitVerifyBorrowEligibilityCompDef>,
    ) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        sol_price_feed: Pubkey,
        usdc_mint: Pubkey,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        market.authority = ctx.accounts.authority.key();
        market.sol_price_feed = sol_price_feed;
        market.usdc_mint = usdc_mint;
        market.bump = ctx.bumps.market;
        Ok(())
    }

    pub fn open_position(ctx: Context<OpenPosition>) -> Result<()> {
        let position = &mut ctx.accounts.position;
        position.owner = ctx.accounts.owner.key();
        position.collateral_lamports = 0;
        position.borrowed_usdc = 0;
        position.pending_borrow_usdc = 0;
        position.last_risk_tier = RiskTier::Secure;
        position.bump = ctx.bumps.position;
        Ok(())
    }

    pub fn deposit_collateral(ctx: Context<DepositCollateral>, lamports: u64) -> Result<()> {
        require!(lamports > 0, ErrorCode::InvalidAmount);

        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.owner.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            lamports,
        )?;

        let position = &mut ctx.accounts.position;
        position.collateral_lamports = position
            .collateral_lamports
            .checked_add(lamports)
            .ok_or(ErrorCode::MathOverflow)?;
        Ok(())
    }

    pub fn withdraw_collateral(ctx: Context<WithdrawCollateral>, lamports: u64) -> Result<()> {
        require!(lamports > 0, ErrorCode::InvalidAmount);

        let position = &mut ctx.accounts.position;
        require!(
            position.borrowed_usdc == 0 && position.pending_borrow_usdc == 0,
            ErrorCode::OutstandingDebt
        );
        require!(
            position.collateral_lamports >= lamports,
            ErrorCode::InsufficientCollateral
        );

        let owner_key = ctx.accounts.owner.key();
        let signer_seeds: &[&[u8]] = &[b"vault", owner_key.as_ref(), &[ctx.bumps.vault]];
        anchor_lang::system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.owner.to_account_info(),
                },
                &[signer_seeds],
            ),
            lamports,
        )?;

        position.collateral_lamports = position
            .collateral_lamports
            .checked_sub(lamports)
            .ok_or(ErrorCode::MathOverflow)?;
        Ok(())
    }

    pub fn request_borrow(
        ctx: Context<RequestBorrow>,
        computation_offset: u64,
        amount_usdc: u64,
        encrypted_risk_inputs: EncryptedRiskInputs,
    ) -> Result<()> {
        require!(amount_usdc > 0, ErrorCode::InvalidAmount);

        let position = &mut ctx.accounts.position;
        require!(position.pending_borrow_usdc == 0, ErrorCode::BorrowAlreadyPending);
        position.pending_borrow_usdc = amount_usdc;

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = ArgBuilder::new()
            .x25519_pubkey(encrypted_risk_inputs.shared_pubkey)
            .plaintext_u128(encrypted_risk_inputs.nonce)
            .encrypted_u64(encrypted_risk_inputs.ciphertext_collateral_lamports)
            .encrypted_u64(encrypted_risk_inputs.ciphertext_borrowed_usdc)
            .encrypted_u64(encrypted_risk_inputs.ciphertext_requested_usdc)
            .encrypted_u64(encrypted_risk_inputs.ciphertext_sol_price_micro_usd)
            .encrypted_u64(encrypted_risk_inputs.ciphertext_market_stress_bps)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![VerifyBorrowEligibilityCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[CallbackAccount {
                    pubkey: ctx.accounts.position.key(),
                    is_writable: true,
                }],
            )?],
            1,
            0,
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "verify_borrow_eligibility")]
    pub fn verify_borrow_eligibility_callback(
        ctx: Context<VerifyBorrowEligibilityCallback>,
        output: SignedComputationOutputs<VerifyBorrowEligibilityOutput>,
    ) -> Result<()> {
        let decision = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(VerifyBorrowEligibilityOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        let position = &mut ctx.accounts.position;
        if decision.field_0 {
            position.borrowed_usdc = position
                .borrowed_usdc
                .checked_add(position.pending_borrow_usdc)
                .ok_or(ErrorCode::MathOverflow)?;
        }
        position.last_risk_tier = RiskTier::from_u8(decision.field_1);
        position.pending_borrow_usdc = 0;

        emit!(BorrowRiskSettledEvent {
            owner: position.owner,
            approved: decision.field_0,
            tier: decision.field_1,
            max_borrow_usdc: decision.field_2,
        });
        Ok(())
    }

    pub fn repay(ctx: Context<MutatePosition>, amount_usdc: u64) -> Result<()> {
        require!(amount_usdc > 0, ErrorCode::InvalidAmount);
        let position = &mut ctx.accounts.position;

        let pending_payment = amount_usdc.min(position.pending_borrow_usdc);
        position.pending_borrow_usdc = position.pending_borrow_usdc.saturating_sub(pending_payment);

        let remaining_payment = amount_usdc.saturating_sub(pending_payment);
        position.borrowed_usdc = position.borrowed_usdc.saturating_sub(remaining_payment);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market"],
        bump
    )]
    pub market: Account<'info, Market>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OpenPosition<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + Position::INIT_SPACE,
        seeds = [b"position", owner.key().as_ref()],
        bump
    )]
    pub position: Box<Account<'info, Position>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositCollateral<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [b"position", owner.key().as_ref()],
        bump = position.bump,
        has_one = owner
    )]
    pub position: Account<'info, Position>,
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawCollateral<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [b"position", owner.key().as_ref()],
        bump = position.bump,
        has_one = owner
    )]
    pub position: Account<'info, Position>,
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("verify_borrow_eligibility", owner)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct RequestBorrow<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [b"position", owner.key().as_ref()],
        bump = position.bump,
        has_one = owner
    )]
    pub position: Account<'info, Position>,
    #[account(
        init_if_needed,
        space = 9,
        payer = owner,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Box<Account<'info, ArciumSignerAccount>>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(
        mut,
        address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: checked by the Arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: checked by the Arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: checked by the Arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_VERIFY_BORROW_ELIGIBILITY))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("verify_borrow_eligibility")]
#[derive(Accounts)]
pub struct VerifyBorrowEligibilityCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_VERIFY_BORROW_ELIGIBILITY))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: checked by Arcium callback constraints.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: checked by Arcium callback constraints.
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"position", position.owner.as_ref()],
        bump = position.bump
    )]
    pub position: Account<'info, Position>,
}

#[init_computation_definition_accounts("verify_borrow_eligibility", payer)]
#[derive(Accounts)]
pub struct InitVerifyBorrowEligibilityCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: checked by the Arcium program.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: checked by the Arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MutatePosition<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [b"position", owner.key().as_ref()],
        bump = position.bump,
        has_one = owner
    )]
    pub position: Account<'info, Position>,
}

#[account]
#[derive(InitSpace)]
pub struct Market {
    pub authority: Pubkey,
    pub sol_price_feed: Pubkey,
    pub usdc_mint: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Position {
    pub owner: Pubkey,
    pub collateral_lamports: u64,
    pub borrowed_usdc: u64,
    pub pending_borrow_usdc: u64,
    pub last_risk_tier: RiskTier,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum RiskTier {
    Secure,
    Healthy,
    RiskElevated,
    Critical,
}

impl RiskTier {
    pub fn from_u8(value: u8) -> Self {
        match value {
            1 => Self::Healthy,
            2 => Self::RiskElevated,
            3 => Self::Critical,
            _ => Self::Secure,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EncryptedRiskInputs {
    pub ciphertext_collateral_lamports: [u8; 32],
    pub ciphertext_borrowed_usdc: [u8; 32],
    pub ciphertext_requested_usdc: [u8; 32],
    pub ciphertext_sol_price_micro_usd: [u8; 32],
    pub ciphertext_market_stress_bps: [u8; 32],
    pub shared_pubkey: [u8; 32],
    pub nonce: u128,
}

#[event]
pub struct BorrowRiskSettledEvent {
    pub owner: Pubkey,
    pub approved: bool,
    pub tier: u8,
    pub max_borrow_usdc: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Insufficient deposited collateral")]
    InsufficientCollateral,
    #[msg("Repay or finalize pending debt before withdrawing collateral")]
    OutstandingDebt,
    #[msg("A borrow request is already waiting for Arcium settlement")]
    BorrowAlreadyPending,
    #[msg("The Arcium computation was aborted")]
    AbortedComputation,
    #[msg("Arcium cluster not set")]
    ClusterNotSet,
}
