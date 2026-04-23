#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Prediction {
    Call, // Up
    Put,  // Down
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TradeStatus {
    Open,
    Won,
    Lost,
    Tie,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Trade {
    pub user: Address,
    pub asset: String,
    pub amount: i128,
    pub entry_price: i128,
    pub expiry_time: u64,
    pub prediction: Prediction,
    pub status: TradeStatus,
}

const TRADE_COUNTER: Symbol = symbol_short!("TRADECNT");

#[contract]
pub struct TradingContract;

#[contractimpl]
impl TradingContract {
    pub fn open_trade(
        env: Env,
        user: Address,
        asset: String,
        amount: i128,
        entry_price: i128,
        expiry_time: u64,
        prediction: Prediction,
    ) -> u64 {
        user.require_auth();

        // Increment trade counter
        let mut trade_id: u64 = env.storage().instance().get(&TRADE_COUNTER).unwrap_or(0);
        trade_id += 1;
        env.storage().instance().set(&TRADE_COUNTER, &trade_id);

        // Store trade
        let trade = Trade {
            user,
            asset,
            amount,
            entry_price,
            expiry_time,
            prediction,
            status: TradeStatus::Open,
        };
        env.storage().persistent().set(&trade_id, &trade);

        trade_id
    }

    pub fn settle_trade(
        env: Env,
        oracle: Address,
        trade_id: u64,
        settlement_price: i128,
    ) -> TradeStatus {
        oracle.require_auth();

        let mut trade: Trade = env
            .storage()
            .persistent()
            .get(&trade_id)
            .expect("Trade not found");

        if trade.status != TradeStatus::Open {
            panic!("Trade already settled");
        }

        let won = match trade.prediction {
            Prediction::Call => settlement_price > trade.entry_price,
            Prediction::Put => settlement_price < trade.entry_price,
        };

        if settlement_price == trade.entry_price {
            trade.status = TradeStatus::Tie;
        } else if won {
            trade.status = TradeStatus::Won;
        } else {
            trade.status = TradeStatus::Lost;
        }

        env.storage().persistent().set(&trade_id, &trade);

        trade.status
    }

    pub fn get_trade(env: Env, trade_id: u64) -> Trade {
        env.storage()
            .persistent()
            .get(&trade_id)
            .expect("Trade not found")
    }
}
