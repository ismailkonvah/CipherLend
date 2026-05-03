use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    pub struct BorrowRiskInput {
        collateral_milli_sol: u64,
        borrowed_usd: u64,
        requested_usd: u64,
        sol_price_usd: u64,
        market_stress_bps: u64,
    }

    pub struct BorrowRiskDecision {
        approved: bool,
        tier: u8,
        max_borrow_usdc: u64,
    }

    #[instruction]
    pub fn verify_borrow_eligibility(input_ctxt: Enc<Shared, BorrowRiskInput>) -> BorrowRiskDecision {
        let input = input_ctxt.to_arcis();
        let base_ltv_bps = 6_500u64;
        let stress_bps = input.market_stress_bps.min(2_500u64);
        let adjusted_ltv_bps = base_ltv_bps - stress_bps;
        let requested_total = input.borrowed_usd + input.requested_usd;
        let collateral_score = input.collateral_milli_sol * input.sol_price_usd * adjusted_ltv_bps;
        let requested_score = requested_total * 10_000u64 * 1_000u64;
        let secure_score = requested_total * 10_000u64 * 1_600u64;
        let healthy_score = requested_total * 10_000u64 * 1_250u64;
        let max_borrow_usdc = collateral_score;
        let approved = requested_score <= collateral_score;
        let tier = if !approved {
            3u8
        } else if healthy_score > collateral_score {
            2u8
        } else if secure_score > collateral_score {
            1u8
        } else {
            0u8
        };

        BorrowRiskDecision {
            approved: approved.reveal(),
            tier: tier.reveal(),
            max_borrow_usdc: max_borrow_usdc.reveal(),
        }
    }
}
