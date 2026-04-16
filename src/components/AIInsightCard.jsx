import { CardShell } from './CardShell.jsx';

export function AIInsightCard({ insight, loading, error, onRefresh }) {
  return (
    <CardShell accent="purple" className="w-full">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#AFA9EC]/20">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#CECBF6]" fill="currentColor">
              <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-[#CECBF6]">AI insight</h3>
          </div>
        </div>

        {onRefresh && !loading && insight && (
          <button
            type="button"
            onClick={onRefresh}
            className="shrink-0 rounded-lg border border-[#AFA9EC]/20 px-2.5 py-1 text-[11px] font-medium text-[#AFA9EC] transition hover:border-[#AFA9EC]/40"
          >
            Refresh ↺
          </button>
        )}
      </div>

      <div className="mt-4 min-h-[56px]">
        {loading && (
          <div className="flex items-center gap-3">
            <TypingDots />
            <span className="text-[13px] text-[#AFA9EC]/60">Analysing your positions…</span>
          </div>
        )}

        {error && !loading && (
          <p className="text-[13px] text-rose-400">
            {error}
          </p>
        )}

        {insight && !loading && !error && (
          <p className="text-[14px] leading-relaxed text-[#CECBF6]">
            {insight}
          </p>
        )}

        {!insight && !loading && !error && (
          <p className="text-[13px] text-[#AFA9EC]/40">
            Analyse a wallet above to get a simple account insight.
          </p>
        )}
      </div>

      {/* API source legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[#AFA9EC]/12 pt-3">
        <Source color="#3C3489" border="#AFA9EC" label="/account + /funding/history" />
        <Source color="#085041" border="#5DCAA5" label="/trades/history" />
        <Source color="#633806" border="#EF9F27" label="/positions" />
        <Source color="#712B13" border="#F0997B" label="/equity_history" />
      </div>
    </CardShell>
  );
}

function Source({ color, border, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="h-2.5 w-2.5 rounded-sm"
        style={{ background: color, border: `1px solid ${border}` }}
      />
      <span className="text-[11px] text-slate-500">{label}</span>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#AFA9EC]"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
