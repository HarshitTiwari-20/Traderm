"use client";

import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";

export default function TradingChart() {
  return (
    <div className="flex flex-col w-full h-full relative">
      <AdvancedRealTimeChart
        symbol="BINANCE:BTCUSDT"
        theme="dark"
        interval="1"
        container_id="tradingview_widget"
        width="100%"
        height="100%"
        hide_top_toolbar={false}
        hide_legend={false}
        save_image={false}
        backgroundColor="rgba(0, 0, 0, 0)" // Make background transparent to match the UI
        style="1" // 1 is candles
        timezone="Etc/UTC"
        toolbar_bg="#000000"
      />
    </div>
  );
}



