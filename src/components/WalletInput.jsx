export function WalletInput({ wallet, setWallet, onAnalyse, loading }) {
  function handleKey(e) {
    if (e.key === 'Enter') onAnalyse();
  }

  return (
    /* Glassmorphism surface matching the Pacifica card style */
    <div className="overflow-hidden rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08)_18%,rgba(255,255,255,0.03)_54%,rgba(255,255,255,0.10))] p-px shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <div className="flex items-center gap-3 rounded-[15px] bg-[linear-gradient(180deg,rgba(3,8,12,0.97),rgba(8,20,28,0.95))] px-4 py-3 sm:px-5">
        {/* Label */}
        <span className="hidden shrink-0 text-[13px] font-medium text-slate-500 sm:block">
          Wallet address
        </span>
        <span className="h-4 w-px shrink-0 bg-white/10 hidden sm:block" />

        {/* Input */}
        <input
          type="text"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Paste Solana wallet address…"
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[14px] font-mono text-white placeholder:text-slate-600 focus:outline-none"
        />

        {/* Analyse button */}
        <button
          type="button"
          onClick={onAnalyse}
          disabled={loading || !wallet.trim()}
          className="shrink-0 rounded-xl bg-sky-400 px-4 py-2 text-[13px] font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Spinner /> Analysing…
            </span>
          ) : (
            'Analyse →'
          )}
        </button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
