use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct BinanceKlineEvent {
    pub e: String,     // Event type
    pub E: u64,        // Event time
    pub s: String,     // Symbol
    pub k: KlineData,
}

#[derive(Debug, Deserialize)]
pub struct KlineData {
    pub t: u64,        // Kline start time
    pub T: u64,        // Kline close time
    pub s: String,     // Symbol
    pub i: String,     // Interval
    pub f: u64,        // First trade ID
    pub L: u64,        // Last trade ID
    pub o: String,     // Open price
    pub c: String,     // Close price
    pub h: String,     // High price
    pub l: String,     // Low price
    pub v: String,     // Base asset volume
    pub n: u64,        // Number of trades
    pub x: bool,       // Is this kline closed?
    pub q: String,     // Quote asset volume
    pub V: String,     // Taker buy base asset volume
    pub Q: String,     // Taker buy quote asset volume
    pub B: String,     // Ignore
}

#[derive(Debug, Clone, Serialize)]
pub struct PriceUpdate {
    pub symbol: String,
    pub price: f64,
    pub timestamp: u64,
    pub open: f64,
    pub high: f64,
    pub low: f64,
}
