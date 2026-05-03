use anchor_lang::prelude::*;

declare_id!("4fT2QQh5sWPZ1bpHrcxRp7urQ5zSJoXiXuMKeCQqoXW7");

pub mod circuits;

#[program]
pub mod cipherlend {
    use super::*;

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
        position.last_risk_tier = RiskTier::Secure;
        position.bump = ctx.bumps.position;
        Ok(())
    }

    pub fn deposit_collateral(ctx: Context<DepositCollateral>, lamports: u64) -> Result<()> {
        require!(lamports > 0, CipherLendError::InvalidAmount);

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
            .ok_or(CipherLendError::MathOverflow)?;
        Ok(())
    }

    pub fn withdraw_collateral(ctx: Context<WithdrawCollateral>, lamports: u64) -> Result<()> {
        require!(lamports > 0, CipherLendError::InvalidAmount);

        let position = &mut ctx.accounts.position;
        require!(
            position.borrowed_usdc == 0 && position.pending_borrow_usdc == 0,
            CipherLendError::OutstandingDebt
        );
        require!(
            position.collateral_lamports >= lamports,
            CipherLendError::InsufficientCollateral
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
            .ok_or(CipherLendError::MathOverflow)?;
        Ok(())
    }

    pub fn request_borrow(
        ctx: Context<MutatePosition>,
        amount_usdc: u64,
        _encrypted_risk_inputs: EncryptedRiskInputs,
    ) -> Result<()> {
        require!(amount_usdc > 0, CipherLendError::InvalidAmount);

        // Next wiring step:
        // 1. Build Arcium ArgBuilder args from encrypted risk inputs.
        // 2. Queue the verify_borrow_eligibility confidential computation.
        // 3. In the Arcium callback, update borrowed_usdc only if approved.
        let position = &mut ctx.accounts.position;
        position.pending_borrow_usdc = amount_usdc;
        Ok(())
    }

    pub fn repay(ctx: Context<MutatePosition>, amount_usdc: u64) -> Result<()> {
        require!(amount_usdc > 0, CipherLendError::InvalidAmount);
        let position = &mut ctx.accounts.position;
        position.borrowed_usdc = position.borrowed_usdc.saturating_sub(amount_usdc);
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
    pub position: Account<'info, Position>,
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
    /// CHECK: SOL-only vault PDA. It is system-owned and has no data.
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
    /// CHECK: SOL-only vault PDA. It is system-owned and has no data.
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EncryptedRiskInputs {
    pub ciphertext_collateral_lamports: [u8; 32],
    pub ciphertext_borrowed_usdc: [u8; 32],
    pub ciphertext_requested_usdc: [u8; 32],
    pub shared_pubkey: [u8; 32],
    pub nonce: u128,
}

#[error_code]
pub enum CipherLendError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Insufficient deposited collateral")]
    InsufficientCollateral,
    #[msg("Repay or finalize pending debt before withdrawing collateral")]
    OutstandingDebt,
}
