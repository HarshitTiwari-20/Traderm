use std::sync::Arc;
use tokio::sync::broadcast;
use crate::models::PriceUpdate;

#[derive(Clone)]
pub struct AppState {
    pub tx: broadcast::Sender<PriceUpdate>,
}

impl AppState {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(100);
        Self { tx }
    }
}
