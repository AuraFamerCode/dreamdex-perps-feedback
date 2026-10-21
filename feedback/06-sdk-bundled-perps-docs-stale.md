# SDK's bundled perps docs are stale: "only BTC and ETH perps", symbols that fail with the wrong hint, and a funding guide that points at Shannon
Severity: normal
Area: docs

**Why normal:** these are the docs that ship *inside* the npm package (`node_modules/@somnia-chain/markets-sdk/docs/`) and are mirrored on https://prd.smk.somnia.host/docs/typescript. A developer who reads them gets three wrong answers on the first perps steps:

1. `docs/PERPS.md` opens with "Perps are live on testnet: `BTC/USDSO:USDSO` and `ETH/USDSO:USDSO`". There are **21** live perp markets, and the uppercase symbols it shows **do not resolve**. The exchange API's symbols are `BTC/USDso:USDso`. The resulting error also misleads: "unknown symbol … — call loadMarkets() first", thrown *after* `loadMarkets()` has already been called.
2. `docs/how-to/get-testnet-funds.md` says it funds "an account on the **Shannon** testnet for… spot and perp collateral". It describes Shannon USDso (`0x9c32f3827a1a99f0cf9b213de8b53ec3d57bb171`, publicly mintable) as "the settlement token of the perps", then says "Perp orders draw margin from the MarginBank… After minting USDso, deposit it: `exchange.depositMargin("BTC/USDso:USDso", 100)`". Perps run on **Hideki (chain 50383)** with USDso `0xed7993A74dAe1e6656B704A424DcD8711aAf4F72`, which the SDK's own `docs/reference/networks-and-endpoints.md` says "cannot be minted" and must be bridged. A developer following the funding guide mints a token that cannot be used for perps.
3. The same files say margin is only locked from the MarginBank ("no per-order token approval"), while the dreamDEX developer docs and the SDK's `getMaxPerpOrderSize` JSDoc describe the pool auto-pulling the shortfall from the owner's wallet (see report 07).

## Steps to reproduce
1. `npm i @somnia-chain/markets-sdk@0.32.1` and open `node_modules/@somnia-chain/markets-sdk/docs/PERPS.md` (lines 1–4) and `docs/how-to/get-testnet-funds.md` (opening paragraph and the "Spot and perp collateral: USDso" and "Perps" sections). Compare with `docs/reference/networks-and-endpoints.md` lines 81–86.
2. Run:

```ts
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
const ex: any = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES })
const markets = await ex.loadMarkets()
const perps = Object.keys(markets).filter(s => s.includes(":"))
console.log("perp symbols:", perps.length, perps.join(", "))
for (const s of ["BTC/USDSO:USDSO" /* as in PERPS.md */, "BTC/USDso:USDso"]) {
  try { const f = await ex.fetchFundingRate(s); console.log("OK ", s, f.fundingRate) }
  catch (e: any) { console.log("ERR", s, e.constructor.name, e.message) }
}
process.exit(0)
```

## Expected
- `PERPS.md` lists the current markets, or tells the reader to call `listPerpMarkets()`, and uses symbols that resolve, `BTC/USDso:USDso`. Symbol lookup either accepts case-insensitive input or the error says "unknown symbol" without suggesting `loadMarkets()` when markets are already loaded.
- `get-testnet-funds.md` funds perps on Hideki: STT for gas via the app's Link a Bot / Top up, the 1,000 paper-USDso voucher via `claimPerpVoucher`, or a bridge from Shannon. It does not tell readers to mint Shannon USDso for perps.

## Actual
```
perp symbols: 21 ZRO/USDso:USDso, LIT/USDso:USDso, VVV/USDso:USDso, 1000PEPE/USDso:USDso, PUMP/USDso:USDso, ZEC/USDso:USDso, TAO/USDso:USDso, WLD/USDso:USDso, NEAR/USDso:USDso, XLM/USDso:USDso, AVAX/USDso:USDso, LINK/USDso:USDso, SUI/USDso:USDso, ADA/USDso:USDso, BNB/USDso:USDso, DOGE/USDso:USDso, XRP/USDso:USDso, HYPE/USDso:USDso, SOL/USDso:USDso, ETH/USDso:USDso, BTC/USDso:USDso
ERR BTC/USDSO:USDSO InvalidInputError @somnia-chain/markets-sdk: unknown symbol BTC/USDSO:USDSO — call loadMarkets() first
OK  BTC/USDso:USDso 0.001185892738007735
```
`get-testnet-funds.md` (0.32.1) contains, verbatim: "This guide shows you how to fund an account on the Shannon testnet for the three things trading needs: gas, spot and perp collateral…", "`USDso` is the quote token of the spot pairs and the settlement token of the perps. On Shannon it has a public `mint(address, uint256)`…", and "## Perps — Perp orders draw margin from the MarginBank, not from the wallet. After minting USDso, deposit it". `networks-and-endpoints.md` in the same package: "Hideki has its own token addresses… USDso on Hideki cannot be minted."

## Evidence
- `evidence/15-symbols.out.txt`
- Script: `sdk-test/15-symbols.ts`
- Files: `node_modules/@somnia-chain/markets-sdk/docs/PERPS.md`, `docs/how-to/get-testnet-funds.md`, `docs/reference/networks-and-endpoints.md` (package version 0.32.1)

## Environment
- `@somnia-chain/markets-sdk` 0.32.1, Node v22.23.3
- Somnia Tokyo / Hideki testnet, chain 50383; read-only, no wallet
- Observed 2026-10-21 ~07:30 UTC
