"use client";

import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";

export default function TradingChart({ symbol = "BINANCE:BTCUSDT" }: { symbol?: string }) {
  return (
    <div className="flex flex-col w-full h-full relative">
      <AdvancedRealTimeChart
        symbol={symbol}
        theme="dark"
        interval="1"
        container_id="tradingview_widget"
        width="100%"
        height="100%"
        hide_top_toolbar={false}
        hide_legend={true}
        save_image={false}
        backgroundColor="rgba(0, 0, 0, 0)"
        style="1"
        timezone="Etc/UTC"
        toolbar_bg="#0d0d12"
      />
    </div>
  );
}
