import TradingChart from "@/components/TradingChart";
import TradePanel from "@/components/TradePanel";
import WalletConnect from "@/components/WalletConnect";

export default function Home() {
  return (
    <main className="flex h-screen w-screen bg-[#0a0a0c] text-white overflow-hidden selection:bg-emerald-500/30">

      {/* Top Navigation / Header */}
      <div className="absolute top-0 left-0 w-full h-16 border-b border-gray-800/60 bg-black/40 backdrop-blur-md z-50 flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-400 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <span className="font-bold text-xl tracking-tight bg-linear-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Traderm</span>
        </div>

        <div className="flex gap-4">
          <WalletConnect />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex w-full pt-16">

        {/* Chart Section */}
        <div className="flex-1 relative">
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
          <TradingChart />
        </div>

        {/* Trading Panel Sidebar */}
        <div className="w-90 flex flex-col p-4 border-l border-gray-800/60 bg-[#0d0d12]">
          <TradePanel />
        </div>

      </div>
    </main>
  );
}
