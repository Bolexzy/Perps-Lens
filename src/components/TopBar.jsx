import { useEffect, useRef, useState } from "react";

export function TopBar({ wallet, setWallet, onAnalyse, loading }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  /* auto-open when wallet is pre-populated or loading */
  useEffect(() => {
    if ((wallet.trim() || loading) && !searchOpen) setSearchOpen(true);
  }, [loading, searchOpen, wallet]);

  /* focus input when search opens */
  useEffect(() => {
    if (!searchOpen) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(id);
  }, [searchOpen]);

  /* close on outside click (only if empty) */
  useEffect(() => {
    function onDown(e) {
      if (!wrapRef.current?.contains(e.target) && !wallet.trim() && !loading)
        setSearchOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [loading, wallet]);

  function handleKey(e) {
    if (e.key === "Enter") onAnalyse();
    if (e.key === "Escape" && !wallet.trim() && !loading) setSearchOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07101e]/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 sm:px-6">
        {/* ── Brand ──────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex gap-2 items-center leading-none">
            <span className="text-[15px] font-bold tracking-tight text-white">
              Perps<span className="text-sky-400 b"> Lens</span>
            </span>
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
              {/* glow ring behind logo */}
              <div className="absolute inset-0 rounded-full bg-sky-400/20 blur-[10px] animate-border-glow" />
            </div>
          </div>
        </div>

        {/* ── Center nav (desktop only) ───────────────────────────── */}
        <nav className="hidden flex-1 items-center justify-center gap-0.5 lg:flex">
          <a
            href="https://app.pacifica.fi"
            target="_blank"
            rel="noreferrer"
            className="nav-link"
          >
            Protocol
          </a>
          <a
            href="https://docs.pacifica.fi"
            target="_blank"
            rel="noreferrer"
            className="nav-link"
          >
            Docs
          </a>
          <span className="nav-link nav-link-active cursor-default select-none">
            Analytics
          </span>
          <a
            href="https://x.com/Bolexzyy__"
            target="_blank"
            rel="noreferrer"
            className="nav-link"
          >
            X / Twitter
          </a>
        </nav>

        {/* ── Right actions ──────────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-2 lg:ml-auto">
          {/* Wallet search */}
          <div
            ref={wrapRef}
            className={`search-wrap overflow-hidden rounded-xl border bg-white/[0.03] transition-all duration-300 ${
              searchOpen
                ? "w-full border-sky-400/20 sm:w-[300px]"
                : "w-9 border-white/[0.09]"
            }`}
          >
            {searchOpen ? (
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!wallet.trim() && !loading) setSearchOpen(false);
                    else if (!loading && wallet.trim()) onAnalyse();
                  }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:text-sky-300"
                  aria-label="Analyse wallet"
                >
                  {loading ? <Spinner /> : <SearchIcon />}
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Paste wallet address…"
                  spellCheck={false}
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-[11px] font-mono leading-none text-white/90 placeholder:text-slate-600 focus:outline-none"
                />

                {wallet && !loading && (
                  <button
                    type="button"
                    onClick={() => setWallet("")}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 transition hover:text-slate-300"
                    aria-label="Clear"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex h-9 w-full items-center justify-center text-slate-400 transition hover:text-sky-300"
                aria-label="Open wallet search"
              >
                <SearchIcon />
              </button>
            )}
          </div>

          {/* Connect Wallet — gradient border */}
          <div className="grad-border-btn shrink-0">
            <button
              type="button"
              className="flex h-[30px] items-center gap-1.5 px-3 text-[12px] font-medium text-sky-300 transition hover:text-sky-200"
            >
              <WalletIcon />
              <span className="hidden sm:inline">Connect</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ── Icons ──────────────────────────────────────────────────────── */
function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path strokeLinecap="round" d="m16 16 4 4" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin-slow"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"
      />
    </svg>
  );
}
