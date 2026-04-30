#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, token};

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
const ORACLE: Symbol = symbol_short!("ORACLE");
const TOKEN: Symbol = symbol_short!("TOKEN");
const ADMIN: Symbol = symbol_short!("ADMIN");
const PAUSED: Symbol = symbol_short!("PAUSED");

#[contract]
pub struct TradingContract;

#[contractimpl]
impl TradingContract {
    pub fn init(env: Env, admin: Address, oracle: Address, token: Address) {
        admin.require_auth();
        if env.storage().instance().has(&ADMIN) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&ORACLE, &oracle);
        env.storage().instance().set(&TOKEN, &token);
        env.storage().instance().set(&PAUSED, &false);
    }

    pub fn admin_pause(env: Env, admin: Address, pause: bool) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&ADMIN).expect("Not initialized");
        if admin != stored_admin {
            panic!("Unauthorized Admin");
        }
        env.storage().instance().set(&PAUSED, &pause);
    }

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

        let is_paused: bool = env.storage().instance().get(&PAUSED).unwrap_or(false);
        if is_paused {
            panic!("Trading is paused");
        }
        if amount <= 0 {
            panic!("Amount must be greater than 0");
        }
        if expiry_time <= env.ledger().timestamp() {
            panic!("Expiry time must be in the future");
        }

        // 1. Lock funds by transferring from user to the smart contract vault
        let token_id: Address = env.storage().instance().get(&TOKEN).expect("Not initialized");
        let token_client = token::Client::new(&env, &token_id);
        token_client.transfer(&user, &env.current_contract_address(), &amount);

        // 2. Increment trade counter
        let mut trade_id: u64 = env.storage().instance().get(&TRADE_COUNTER).unwrap_or(0);
        trade_id += 1;
        env.storage().instance().set(&TRADE_COUNTER, &trade_id);

        // 3. Store trade
        let trade = Trade {
            user: user.clone(),
            asset: asset.clone(),
            amount,
            entry_price,
            expiry_time,
            prediction: prediction.clone(),
            status: TradeStatus::Open,
        };
        env.storage().persistent().set(&trade_id, &trade);

        // 4. Emit event
        env.events().publish((symbol_short!("trade"), symbol_short!("opened"), trade_id), trade);

        trade_id
    }

    pub fn settle_trade(
        env: Env,
        oracle: Address,
        trade_id: u64,
        twap_price: i128,
    ) -> TradeStatus {
        oracle.require_auth();

        let stored_oracle: Address = env.storage().instance().get(&ORACLE).expect("Not initialized");
        if oracle != stored_oracle {
            panic!("Unauthorized Oracle");
        }

        let mut trade: Trade = env
            .storage()
            .persistent()
            .get(&trade_id)
            .expect("Trade not found");

        if trade.status != TradeStatus::Open {
            panic!("Trade already settled");
        }

        let won = match trade.prediction {
            Prediction::Call => twap_price > trade.entry_price,
            Prediction::Put => twap_price < trade.entry_price,
        };

        let token_id: Address = env.storage().instance().get(&TOKEN).expect("Not initialized");
        let token_client = token::Client::new(&env, &token_id);

        let mut payout: i128 = 0;

        if twap_price == trade.entry_price {
            trade.status = TradeStatus::Tie;
            payout = trade.amount;
        } else if won {
            trade.status = TradeStatus::Won;
            // Payout: original stake + 80% profit from the vault
            payout = trade.amount + (trade.amount * 80 / 100);
        } else {
            trade.status = TradeStatus::Lost;
            // Do nothing with funds. The lost amount stays locked in the contract 
            // vault to provide liquidity for future winners!
        }

        // Reentrancy guard: Update state before transferring funds
        env.storage().persistent().set(&trade_id, &trade);

        // Emit settled event
        env.events().publish((symbol_short!("trade"), symbol_short!("settled"), trade_id), trade.clone());

        if payout > 0 {
            token_client.transfer(&env.current_contract_address(), &trade.user, &payout);
            // Emit payout event
            env.events().publish((symbol_short!("trade"), symbol_short!("payout"), trade_id), payout);
        }

        trade.status
    }

    pub fn get_trade(env: Env, trade_id: u64) -> Trade {
        env.storage()
            .persistent()
            .get(&trade_id)
            .expect("Trade not found")
    }
}
