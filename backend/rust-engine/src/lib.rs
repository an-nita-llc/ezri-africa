use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};

#[derive(Serialize, Deserialize, Debug)]
pub struct ValuationRequest {
    pub amount_usd: f64,
    pub currency_code: String,
    pub exchange_rate: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ValuationResponse {
    pub amount_usd: f64,
    pub fee_usd: f64,
    pub total_charged_usd: f64,
    pub local_payout: f64,
    pub currency_code: String,
    pub cryptographic_hash: String,
}

pub fn calculate_valuation(req: &ValuationRequest) -> ValuationResponse {
    let fee_usd = (req.amount_usd * 0.02 * 100.0).round() / 100.0;
    let total_charged_usd = ((req.amount_usd + fee_usd) * 100.0).round() / 100.0;
    let local_payout = (req.amount_usd * req.exchange_rate * 100.0).round() / 100.0;

    let raw_data = format!("{}:{}:{}", req.amount_usd, req.currency_code, local_payout);
    let mut hasher = Sha256::new();
    hasher.update(raw_data.as_bytes());
    let result = hasher.finalize();
    let cryptographic_hash = format!("{:x}", result);

    ValuationResponse {
        amount_usd: req.amount_usd,
        fee_usd,
        total_charged_usd,
        local_payout,
        currency_code: req.currency_code.clone(),
        cryptographic_hash,
    }
}
