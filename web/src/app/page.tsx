"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type AuthMode = "signin" | "signup";

export default function HomePage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const openModal = (m: AuthMode) => {
    setMode(m);
    setError("");
    setName(""); setEmail(""); setPassword("");
    setModalOpen(true);
    setMobileMenuOpen(false);
  };

  const closeModal = () => {
    if (loading) return;
    setModalOpen(false);
    setError("");
  };

  // Close mobile menu on resize
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileMenuOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Animated waveform canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const lines = 8;
      for (let i = 0; i < lines; i++) {
        ctx.beginPath();
        const baseY = canvas.height * 0.55 + i * 38;
        const alpha = 0.04 + (i / lines) * 0.06;
        ctx.strokeStyle = `rgba(52, 211, 153, ${alpha})`;
        ctx.lineWidth = 1.2;
        for (let x = 0; x <= canvas.width; x += 4) {
          const y =
            baseY +
            Math.sin((x / canvas.width) * Math.PI * 3 + t + i * 0.5) * (24 + i * 6) +
            Math.sin((x / canvas.width) * Math.PI * 6 - t * 1.3 + i) * (10 + i * 2);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
      t += 0.008;
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/signin";
      const body = mode === "signup" ? { name, email, password } : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      router.push("/terminal");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050507] flex flex-col">

      {/* Animated canvas background */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 60%, rgba(16,185,129,0.07) 0%, transparent 70%)" }}
      />
      {/* Top-right accent */}
      <div
        className="absolute top-0 right-0 w-[400px] h-[400px] pointer-events-none z-0"
        style={{ background: "radial-gradient(circle at top right, rgba(99,102,241,0.08) 0%, transparent 60%)" }}
      />

      {/* ── Navbar ── */}
      <nav className="relative z-20 flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5 border-b border-white/5 backdrop-blur-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">
            Traderm
          </span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-3">
          <a href="https://docs.google.com/forms/d/e/1FAIpQLScaMn0zxAGOM5WlV-1vvt368VVtl7G4fhDVlFE9ozsWiUsdvQ/viewform?usp=publish-editor" target="_blank" rel="noreferrer"
            className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 text-sm font-medium flex items-center gap-1.5" aria-label="Feedback Form">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="hidden lg:inline">Feedback</span>
          </a>
          <a href="https://github.com/HarshitTiwari-20/Traderm" target="_blank" rel="noreferrer"
            className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5" aria-label="GitHub">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
          <a href="https://x.com/Harshit_310" target="_blank" rel="noreferrer"
            className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5" aria-label="X (Twitter)">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
            </svg>
          </a>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <button onClick={() => openModal("signin")}
            className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5">
            Sign In
          </button>
          <button onClick={() => openModal("signup")}
            className="text-sm font-medium px-4 py-2 rounded-lg border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-400 transition-all">
            Get Started
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
          onClick={() => setMobileMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="relative z-20 md:hidden flex flex-col gap-2 px-5 py-4 border-b border-white/5 bg-[#050507]/95 backdrop-blur-md">
          <button onClick={() => openModal("signin")}
            className="w-full py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left px-4">
            Sign In
          </button>
          <button onClick={() => openModal("signup")}
            className="w-full py-3 rounded-xl text-sm font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-all text-center">
            Get Started
          </button>
          <div className="flex items-center gap-3 pt-1 px-1">
            <a href="https://forms.google.com/" target="_blank" rel="noreferrer"
              className="text-gray-500 hover:text-white transition-colors" aria-label="Feedback Form">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </a>
            <a href="https://github.com/HarshitTiwari-20/Traderm" target="_blank" rel="noreferrer"
              className="text-gray-500 hover:text-white transition-colors" aria-label="GitHub">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
            <a href="https://x.com/Harshit_310" target="_blank" rel="noreferrer"
              className="text-gray-500 hover:text-white transition-colors" aria-label="X">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 text-center px-5 sm:px-8 pt-12 sm:pt-16 pb-28 sm:pb-32">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/5 text-emerald-400 text-xs font-medium tracking-wide mb-7 sm:mb-8"
          style={{ backdropFilter: "blur(8px)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Fixed-Time Binary Options on Stellar
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight text-white max-w-4xl">
          Trade Smarter with{" "}
          <span className="bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
            Stellar
          </span>{" "}
          AI.
        </h1>

        <p className="mt-5 sm:mt-6 text-gray-400 text-base sm:text-lg max-w-sm sm:max-w-xl leading-relaxed">
          Real-time binary options trading powered by Soroban smart contracts.
          Predict, trade, and profit — all on-chain.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-8 sm:mt-10 w-full sm:w-auto">
          <button
            onClick={() => openModal("signup")}
            className="group relative w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-base shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] transition-all overflow-hidden"
          >
            <span className="relative z-10">Start Trading</span>
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
          </button>
          <button
            onClick={() => openModal("signin")}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-base transition-all"
            style={{ backdropFilter: "blur(8px)" }}
          >
            Sign In
          </button>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap justify-center gap-8 sm:gap-10 mt-14 sm:mt-16 text-center">
          {[
            { label: "Payout Rate", value: "80%" },
            { label: "Avg Trade Time", value: "60s" },
            { label: "Network", value: "Stellar" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <span className="text-2xl font-bold text-white">{s.value}</span>
              <span className="text-xs text-gray-500 uppercase tracking-widest">{s.label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* ── Auth Modal ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backdropFilter: "blur(16px)", background: "rgba(5,5,7,0.7)" }}
          onClick={closeModal}
        >
          <div
            className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#0d0d12]/98 shadow-2xl shadow-black/60 p-6 sm:p-8 max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle on mobile */}
            <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

            {/* Close */}
            <button
              onClick={closeModal}
              disabled={loading}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-bold text-base bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">
                Traderm
              </span>
            </div>

            {/* Tab switch */}
            <div className="flex rounded-xl bg-white/5 border border-white/8 p-1 mb-7">
              {(["signin", "signup"] as AuthMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(""); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === m ? "bg-white/10 text-white shadow" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {m === "signin" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>

            <h2 className="text-xl font-bold text-white mb-1">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {mode === "signin"
                ? "Sign in to access your trading terminal."
                : "Join Traderm and start trading on Stellar."}
            </p>

            {error && (
              <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12A9 9 0 113 12a9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === "signup" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400 font-medium">Full Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                    placeholder="Harshit Tiwari"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 transition-all" />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-medium">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="you@example.com"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 transition-all" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-medium">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={8}
                  placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 transition-all" />
              </div>

              <button type="submit" disabled={loading}
                className="group relative w-full mt-2 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:shadow-none transition-all overflow-hidden">
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      {mode === "signup" ? "Creating Account..." : "Signing In..."}
                    </>
                  ) : (
                    mode === "signup" ? "Create Account" : "Sign In"
                  )}
                </span>
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-gray-600">
              {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
              <button type="button"
                onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
                className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
                {mode === "signin" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      )}
      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 bg-black/20 py-12 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-bold text-base bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">
                Traderm
              </span>
            </div>
            <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
              The first fixed-time trading terminal on Stellar. Trade on-chain with speed and security.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-x-12 gap-y-8">
            <div className="flex flex-col gap-3">
              <span className="text-white text-sm font-semibold">Product</span>
              <a href="/terminal" className="text-gray-500 hover:text-emerald-400 text-sm transition-colors">Terminal</a>
              <a href="https://github.com/HarshitTiwari-20/Traderm" target="_blank" className="text-gray-500 hover:text-emerald-400 text-sm transition-colors">Docs</a>
              <a href="#" className="text-gray-500 hover:text-emerald-400 text-sm transition-colors">Leaderboard</a>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-white text-sm font-semibold">Community</span>
              <a href="https://x.com/Harshit_310" target="_blank" className="text-gray-500 hover:text-emerald-400 text-sm transition-colors">Twitter</a>
              <a href="#" className="text-gray-500 hover:text-emerald-400 text-sm transition-colors">Discord</a>
              <a href="https://github.com/HarshitTiwari-20/Traderm" target="_blank" className="text-gray-500 hover:text-emerald-400 text-sm transition-colors">GitHub</a>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-white text-sm font-semibold">Legal</span>
              <a href="#" className="text-gray-500 hover:text-emerald-400 text-sm transition-colors">Terms</a>
              <a href="#" className="text-gray-500 hover:text-emerald-400 text-sm transition-colors">Privacy</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] sm:text-xs text-gray-600">
          <span>© 2026 Traderm. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span>Powered by Soroban</span>
            <div className="w-1 h-1 rounded-full bg-gray-800" />
            <span>Built on Stellar</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

