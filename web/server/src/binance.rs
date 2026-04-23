use futures_util::StreamExt;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use tracing::{error, info};
use crate::models::{BinanceKlineEvent, PriceUpdate};
use crate::broadcaster::AppState;

pub async fn start_binance_ws(state: AppState) {
    let symbol = "btcusdt";
    let url = format!("wss://stream.binance.com:9443/ws/{}@kline_1s", symbol);

    info!("Connecting to Binance WebSocket: {}", url);

    loop {
        match connect_async(&url).await {
            Ok((ws_stream, _)) => {
                info!("Connected to Binance WebSocket!");
                let (_, mut read) = ws_stream.split();

                while let Some(msg) = read.next().await {
                    match msg {
                        Ok(Message::Text(text)) => {
                            if let Ok(event) = serde_json::from_str::<BinanceKlineEvent>(&text) {
                                if let (Ok(price), Ok(open), Ok(high), Ok(low)) = (
                                    event.k.c.parse::<f64>(),
                                    event.k.o.parse::<f64>(),
                                    event.k.h.parse::<f64>(),
                                    event.k.l.parse::<f64>()
                                ) {
                                    let update = PriceUpdate {
                                        symbol: event.s.clone(),
                                        price,
                                        timestamp: event.E,
                                        open,
                                        high,
                                        low,
                                    };
                                    // Ignore send errors if no clients are connected
                                    let _ = state.tx.send(update);
                                }
                            }
                        }
                        Ok(Message::Ping(_)) => {}
                        Err(e) => {
                            error!("Error receiving message from Binance: {:?}", e);
                            break;
                        }
                        _ => {}
                    }
                }
            }
            Err(e) => {
                error!("Failed to connect to Binance WebSocket: {:?}", e);
            }
        }

        // Wait before reconnecting
        tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
        info!("Reconnecting to Binance WebSocket...");
    }
}
