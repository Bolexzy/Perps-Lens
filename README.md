# Perps Lens

Perps Lens is a responsive Pacifica portfolio dashboard for Solana perpetual traders. Paste a wallet address and the app pulls live Pacifica account data, surfaces portfolio and risk metrics, renders activity tables, and generates lightweight AI insights.

## Highlights

- Live Pacifica account, position, funding, order, balance, and portfolio volume data
- Portfolio overview with funding, margin, and exposure ring modes
- Range-aware performance chart and analytics cards
- Activity tabs for positions, open orders, trade history, order history, funding, deposits/withdrawals, and payouts
- Mobile-friendly and desktop-friendly dashboard layout
- Optional OpenAI-powered account insights with local fallback when no API key is set

## Stack

- React 18
- Vite
- Tailwind CSS v4
- Recharts
- Pacifica public API

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Copy `.env.example` to `.env.local`.

```bash
cp .env.example .env.local
```

Available variables:

- `VITE_OPENAI_API_KEY`
  Enables AI insight generation. Optional.
- `VITE_OPENAI_MODEL`
  Optional model override. Defaults to `gpt-4.1-mini`.
- `VITE_BUILDER_CODE`
  Builder attribution included in Pacifica API requests. Defaults to `pacificalens`.

Important:

- `VITE_*` variables are exposed to the browser in Vite builds.
- If you want production-safe AI usage, move the OpenAI request behind a server endpoint instead of shipping the key to the client.

### 3. Start the app

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
```

## Scripts

- `npm run dev` starts the local Vite dev server
- `npm run build` creates a production build
- `npm run preview` serves the production build locally

## How It Works

The app queries Pacifica endpoints for:

- account info
- positions
- funding history
- trade history
- order history
- open orders
- balance history
- equity history
- portfolio volume

That raw data is normalized and transformed into:

- portfolio stats
- right-side mini analytics cards
- chart series
- activity tables
- simple AI summary text

## Project Structure

```text
src/
  api/           Pacifica and AI clients
  components/    Dashboard UI components
  lib/           Analytics and data shaping helpers
  AppPage.jsx    Main app shell and data orchestration
```

## Deployment

### GitHub

After creating your GitHub repo:

```bash
git remote add origin <your-repo-url>
git push -u origin main
```

### Vercel

This is a standard Vite frontend, so Vercel deployment is straightforward:

1. Import the GitHub repo into Vercel
2. Framework preset: `Vite`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add any needed environment variables from `.env.example`

## Notes

- The app uses Vite dev proxies locally for Pacifica and OpenAI requests.
- Some Pacifica endpoints may return partial data or intermittent errors depending on the wallet and endpoint availability.
- The AI insights are intentionally lightweight and concise.

## Credits

Built by `Tife X Gtek`.
