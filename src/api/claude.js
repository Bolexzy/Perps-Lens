/**
 * Simple ChatGPT-style insight via OpenAI Responses API.
 * Falls back to a lightweight local summary when no OpenAI key is present.
 * Dev proxy: /proxy/openai -> api.openai.com
 */

const MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4.1-mini';

const SYSTEM_PROMPT = `You are a concise crypto perpetual futures account analyst.
Return 2 to 4 plain-English sentences.
Keep it simple, practical, and readable.
Mention one strength, one risk, and one thing to watch next.
Do not use markdown or bullet points.`;

export async function getAIInsight({ fundingStats, tradeStats, positionRisks, equityStats }) {
  const context = buildContext({ fundingStats, tradeStats, positionRisks, equityStats });
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    return buildSimpleInsight({ fundingStats, tradeStats, positionRisks, equityStats });
  }

  const endpoint = import.meta.env.DEV
    ? '/proxy/openai/v1/responses'
    : 'https://api.openai.com/v1/responses';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_output_tokens: 180,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: SYSTEM_PROMPT }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: `Analyse this Pacifica account:\n\n${context}` }],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI API: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return (
    data.output_text ??
    data.output?.[0]?.content?.[0]?.text ??
    buildSimpleInsight({ fundingStats, tradeStats, positionRisks, equityStats })
  );
}

function buildContext({ fundingStats, tradeStats, positionRisks, equityStats }) {
  const pos = positionRisks ?? [];
  const lines = [];

  if (fundingStats) {
    lines.push(`Monthly funding cost: $${fundingStats.totalMonth?.toFixed(2) ?? '?'} (${fundingStats.direction})`);
    lines.push(`Daily funding avg: $${fundingStats.dailyAvg?.toFixed(2) ?? '?'}/day`);
  }

  if (tradeStats) {
    lines.push(
      `Closed trades: ${tradeStats.total}, win rate: ${(tradeStats.winRate * 100).toFixed(1)}%, avg PnL: $${tradeStats.avgPnl?.toFixed(2) ?? '?'}, best market: ${tradeStats.bestMarket ?? 'N/A'}`
    );
    lines.push(`Total realised PnL: $${tradeStats.totalPnl?.toFixed(2) ?? '?'}`);
  }

  if (pos.length > 0) {
    lines.push(`Open positions: ${pos.length}`);
    for (const p of pos.slice(0, 4)) {
      lines.push(
        `${p.market} ${p.side?.toUpperCase()} liq distance ${p.distancePct?.toFixed(1)}%, unrealised PnL $${p.unrealisedPnl?.toFixed(2)}`
      );
    }
  } else {
    lines.push('No open positions.');
  }

  if (equityStats) {
    lines.push(`30d return: ${equityStats.return30d?.toFixed(2) ?? '?'}%, max drawdown: ${equityStats.maxDrawdown?.toFixed(2) ?? '?'}%`);
    lines.push(`Current equity: $${equityStats.current?.toFixed(2) ?? '?'}`);
  }

  return lines.join('\n');
}

function buildSimpleInsight({ fundingStats, tradeStats, positionRisks, equityStats }) {
  const lines = [];
  const nearestRisk = [...(positionRisks ?? [])].sort(
    (a, b) => (a.distancePct ?? Infinity) - (b.distancePct ?? Infinity)
  )[0];

  if (tradeStats?.winRate !== undefined) {
    const winRate = (tradeStats.winRate * 100).toFixed(1);
    const realized = tradeStats.totalPnl ?? 0;
    lines.push(
      realized >= 0
        ? `This account is still performing reasonably well, with a ${winRate}% win rate and positive realized trading results.`
        : `This account is active, but realized trading results are under pressure despite a ${winRate}% win rate.`
    );
  }

  if (equityStats) {
    const dd = equityStats.maxDrawdown?.toFixed(2) ?? '0.00';
    lines.push(`Recent volatility is meaningful, with max drawdown around ${dd}% over the tracked period.`);
  }

  if (nearestRisk?.market) {
    lines.push(`${nearestRisk.market} is the closest position to liquidation, so that is the main risk to monitor next.`);
  }

  if (fundingStats?.dailyAvg) {
    lines.push(
      fundingStats.sign < 0
        ? `Funding is costing roughly $${fundingStats.dailyAvg.toFixed(2)} per day.`
        : `Funding is currently adding about $${fundingStats.dailyAvg.toFixed(2)} per day.`
    );
  }

  return lines.slice(0, 3).join(' ') || 'This account has limited activity data right now, so there is not enough signal for a useful insight yet.';
}