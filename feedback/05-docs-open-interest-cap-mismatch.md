# Perps market table: "Open interest cap" does not match on-chain `maxOpenInterest` (20 of 21 markets), and "account capped at a tenth" is false
Severity: normal
Area: docs

**Why normal:** this is a documentation error, but it is about risk limits that bots size against. The page says the figures "are read from the live markets". Yet the OI-cap column is 2× to 4× below the on-chain cap on 20 markets. BTC-PERP's **live** open interest (≈294 BTC) is already above the documented "cap" (246.8 BTC), which a cap cannot be. Both the trader page and the developer page also state that a single account is capped at "a tenth" of the OI cap on most markets. On chain, `maxPositionSize / maxOpenInterest` is 0.025 or 0.05 on 18 markets, 0.10 only on TAO, 0.20 on BTC and 0.25 on ZEC. A bot that derives its per-account limit from the docs gets the wrong number.

## Steps to reproduce
1. Open https://app.testnet.dreamdex.io/docs/trading/perps-testnet, section **Markets**, column "Open interest cap", and the sentence "A single account is capped at a tenth of it on most markets."
2. Open https://app.testnet.dreamdex.io/docs/developers/perps-testnet, **Common pitfalls**: "Each account has a position cap per market, a tenth of the market's open interest cap on most markets… `getMaxPerpOrderSize` reports the cap as `maxPositionSize`."
3. Read the on-chain risk parameters:

```ts
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { formatUnits } from "viem"
const m = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES })
for (const mk of await m.client.listPerpMarkets()) {
  const r = await m.client.getPerpRiskParams(mk.poolAddress as any)
  const d = mk.baseDecimals
  console.log(mk.baseSymbol, "maxOI", formatUnits(r.maxOpenInterest, d), "maxPos", formatUnits(r.maxPositionSize, d),
    "ratio", (Number(r.maxPositionSize) / Number(r.maxOpenInterest)).toFixed(4), "liveOI", formatUnits(BigInt(mk.openInterest), d))
}
process.exit(0)
```

## Expected
The "Open interest cap" column equals `getPerpRiskParams(pool).maxOpenInterest`, and the per-account statement matches `maxPositionSize`. Otherwise the page should say what the column actually is, for example "per side".

## Actual
Docs vs chain, 2026-10-21 ~07:30 UTC:

| Market | Docs "OI cap" | On-chain `maxOpenInterest` | Docs ÷ chain | On-chain `maxPositionSize` | maxPos ÷ maxOI | Live OI |
|---|---|---|---|---|---|---|
| BTC | 246.81545 | 493.6309 | 0.50 | 100 | **0.2026** | **293.89** (> docs cap) |
| ETH | 3,995.6125 | 7,991.225 | 0.50 | 399.5612 | 0.05 | 975.9 |
| SOL | 47,654.44 | 95,308.88 | 0.50 | 4,765.44 | 0.05 | 23,701.8 |
| XRP | 344,632 | 1,378,528 | 0.25 | 68,926.4 | 0.05 | 1,143,264 |
| NEAR | 250,410 | 1,001,640 | 0.25 | 50,000 | 0.05 | 179,921 |
| ZRO | 250,599.5 | 1,002,398 | 0.25 | 25,059.9 | 0.025 | 9,101 |
| ZEC | 420 | 1,680 | 0.25 | 420 | **0.25** | 50.6 |
| TAO | 2,185.491 | 2,185.491 | 1.00 (only match) | 218.549 | 0.10 | 102.8 |
| BNB | 693.975 | 2,775.9 | 0.25 | 140 | 0.0504 | 219.5 |

All 21 rows are in `evidence/13-risk.out.txt`. Only TAO matches. The "a tenth" ratio holds only for TAO. Every other market is 0.025 or 0.05, except BTC (0.2026) and ZEC (0.25).

Tick size, min size, max leverage and initial/maintenance margin in the same table **do** match the chain (`getOrderBookParameters`, `initialMarginBps`, `maintenanceMarginBps`). The mismatch is confined to the OI-cap column and the "tenth" claims.

## Evidence
- `evidence/13-risk.out.txt`: full 21-market dump (IM, MM, maxOI, maxPos, ratio, live OI, fees)
- Script: `sdk-test/13-risk.ts`
- Doc pages as fetched 2026-10-21: https://app.testnet.dreamdex.io/docs/trading/perps-testnet, https://app.testnet.dreamdex.io/docs/developers/perps-testnet

## Environment
- `@somnia-chain/markets-sdk` 0.32.1 (`client.getPerpRiskParams`, `client.listPerpMarkets`), Node v22.23.3
- Somnia Tokyo / Hideki testnet, chain 50383; read-only, no wallet needed
- Observed 2026-10-21 ~07:30 UTC
