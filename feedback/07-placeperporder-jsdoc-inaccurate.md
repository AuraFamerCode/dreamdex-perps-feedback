# `placePerpOrder` / `PlacePerpOrderParams` JSDoc: wrong funding model and incomplete `orderType` list
Severity: normal
Area: SDK (docs / typings)

**Why normal:** IDE hover text and the generated API reference (https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/PlacePerpOrderParams) are the main docs a TypeScript developer reads while writing an order call. Two statements there are wrong or incomplete and contradict the SDK's own docs elsewhere:

1. **Funding model.** `PlacePerpOrderParams` says: "Margin is locked from the signer's MarginBank balance (**no escrow transfer in this tx**) — `Trader.depositMargin` first." `Trader.placePerpOrder` repeats "depositMargin first". But the SDK's own `getMaxPerpOrderSize` JSDoc (same package) says "Pass `autoPull` when the transaction sender will be the order owner. That is the pool's whole gate for topping the account up from its wallet (T70)… an account with an empty bank and a funded, approved wallet goes from a max of `0n` to whatever the wallet funds." The dreamDEX developer docs say the owner's own `placeOrder` "tries to pull the shortfall from the wallet". So an owner order *can* transfer collateral from the wallet in the same transaction, and depositing first is not required.
2. **Order types.** `PlacePerpOrderParams.orderType` says "0 limit (default) or 2 market (IOC)". The exported `ORDER_TYPE` constant is `{ LIMIT: 0, FILL_OR_KILL: 1, MARKET: 2, POST_ONLY: 3 }`, `BatchOrderRequest.orderType` documents all four, and the perps Orders page lists GTC / IOC / FOK / ALO. Readers of the perp param type are told FOK and post-only do not exist.

## Steps to reproduce
1. `npm i @somnia-chain/markets-sdk@0.32.1`.
2. `grep -n -A1 "no escrow\|0 limit (default) or 2 market" node_modules/@somnia-chain/markets-sdk/dist/trade.d.ts`
3. `grep -n "Pass \`autoPull\`" -A4 node_modules/@somnia-chain/markets-sdk/dist/somniaMarketsClient.d.ts`
4. `node -e "import('@somnia-chain/markets-sdk').then(m=>console.log(m.ORDER_TYPE))"`

## Expected
- `PlacePerpOrderParams` / `placePerpOrder` say that an owner's order auto-pulls any margin shortfall from the wallet when the wallet holds and has approved collateral, and that `depositMargin` is optional. If the SDK deliberately disables auto-pull, say so and how.
- `orderType` documents `0 LIMIT, 1 FILL_OR_KILL, 2 MARKET (IOC), 3 POST_ONLY` and links `ORDER_TYPE`, as `BatchOrderRequest` does.

## Actual
```
dist/trade.d.ts  (PlacePerpOrderParams):
  "Inputs to Trader.placePerpOrder — a perp limit or market order on a PerpPool. Margin is locked from the
   signer's MarginBank balance (no escrow transfer in this tx) — Trader.depositMargin first."
  orderType: "0 limit (default) or 2 market (IOC). See ORDER_TYPE."
dist/trade.d.ts  (BatchOrderRequest.orderType):
  "0 limit (default), 1 FillOrKill, 2 market/IOC, 3 PostOnly. See ORDER_TYPE."
dist/somniaMarketsClient.d.ts  (getMaxPerpOrderSize):
  "Pass `autoPull` when the transaction sender will be the order owner. That is the pool's whole gate for
   topping the account up from its wallet (T70)…"
ORDER_TYPE { LIMIT: 0, FILL_OR_KILL: 1, MARKET: 2, POST_ONLY: 3 }
```
Developer docs (https://app.testnet.dreamdex.io/docs/developers/perps-testnet, "Scale quantity by the base asset's decimals"): "The owner's own `placeOrder` fails differently, with `ERC20: transfer amount exceeds balance`, because the pool tries to pull the shortfall from the wallet."

Note: I did not broadcast a funded order to observe the auto-pull itself, because I have no funded wallet. This report is about the SDK's typings and docs contradicting each other and the protocol docs, which is verifiable from the shipped package.

## Evidence
- `evidence/14-misc.out.txt` (`ORDER_TYPE` value)
- Package files: `dist/trade.d.ts` (`PlacePerpOrderParams`, `BatchOrderRequest`, `Trader.placePerpOrder`), `dist/somniaMarketsClient.d.ts` (`getMaxPerpOrderSize`)

## Environment
- `@somnia-chain/markets-sdk` 0.32.1, TypeScript 7.0.2, Node v22.23.3
- No network or wallet needed for the typings check
- Observed 2026-10-21
