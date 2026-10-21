# `getMaxPerpOrderSize` says `placeable: true` for a price off the tick grid, and `placePerpOrder` broadcasts it, but the pool reverts `InvalidPrice`
Severity: normal
Area: SDK

**Why normal:** the docs present `getMaxPerpOrderSize` as the pre-trade check: "check it before sending rather than reading a revert afterwards". Its JSDoc says it backs a **Max** button and to "Check `placeable`". For any price that is not a multiple of the market's `tickSize`, it returns `placeable: true` with a non-zero `maxQuantity`, while the pool rejects that order with `InvalidPrice(price, tickSize)`. `placePerpOrder` checks only `price > 0 && quantity > 0` and broadcasts the misaligned order without a grid check. A funded account would therefore mine a reverting transaction and pay gas. The SDK already knows `tickSize`, `lotSize` and `minQuantity`: they are on the market row and in the `getMaxPerpOrderSize` result itself, and the SDK even exports `roundPriceToTick` / `snapRawToGrid`. The same function also returns `placeable: true` for `price = 2^256` and `2^255`. The first cannot even be ABI-encoded, and the second is not a real price.

## Steps to reproduce
1. Size an order at an on-tick price and at the same price +1 wei, for any funded account. Read-only: this is an `eth_call`, so no key is needed. The account below is a public, active BTC-PERP trader taken from the indexer's fills.
2. Simulate `placeOrder` from that same account at both prices.

```ts
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets, perpPoolWriteAbi, contractErrorsAbi } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { createPublicClient, http, parseUnits, zeroAddress } from "viem"

const m = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES })
const pc = createPublicClient({ chain: hidekiTestnet as any, transport: http("https://api.hideki2.infra.testnet.somnia.network") })
const btc = (await m.client.listPerpMarkets()).find(x => x.baseSymbol === "BTC")!   // tickSize = 1e17 (0.1 USDso)
const account = "0x47537e3a3ea6e9391f3b26ea45618db6828c8bff"                      // public active trader, read-only
const onTick = parseUnits("70000", 18), offTick = onTick + 1n

for (const price of [onTick, offTick, 2n ** 255n, 2n ** 256n]) {
  const r = await m.client.getMaxPerpOrderSize({ pool: btc.poolAddress as any, marginBank: btc.marginBank as any, account, isBid: true, price })
  console.log("max", price === onTick ? "on-tick" : price === offTick ? "off-tick" : price.toString().slice(0,8)+"…", { placeable: r.placeable, maxQuantity: r.maxQuantity, limitedBy: r.limitedBy })
}
for (const price of [onTick, offTick]) {
  try {
    await pc.simulateContract({ address: btc.poolAddress as any, abi: [...perpPoolWriteAbi, ...contractErrorsAbi] as any, functionName: "placeOrder",
      account: account as any, args: [true, 0n, price, 20000n, 2n ** 63n, 0, 0, zeroAddress, 0n], gas: 10_000_000n })
    console.log("simulate", price === onTick ? "on-tick" : "off-tick", "OK")
  } catch (e: any) { console.log("simulate", price === onTick ? "on-tick" : "off-tick", "REVERT", e.walk((x: any) => x?.data)?.data?.errorName) }
}
process.exit(0)
```

## Expected
For an off-tick price, `getMaxPerpOrderSize` should report `placeable: false` (for example `limitedBy: "priceOffTick"`) or throw `InvalidInputError`. Prices ≥ 2^256 should be rejected as invalid input. `placePerpOrder` should refuse an off-tick price or off-lot quantity locally, or align it, rather than broadcast a transaction that cannot succeed.

## Actual
```
max on-tick   placeable: true, maxQuantity: 9107937000, limitedBy: "initialMargin"
max off-tick  placeable: true, maxQuantity: 9107937000, limitedBy: "initialMargin"   <-- lockAmount differs by 1 wei, nothing else
max 2^255     placeable: true, maxQuantity: 9074883000, limitedBy: "collateral"
max 2^256     placeable: true, maxQuantity: 9074883000, limitedBy: "collateral"      <-- price not encodable as uint256
simulate on-tick   OK
simulate off-tick  REVERT InvalidPrice
```
Raw node response for the off-tick simulation: `{"code":3,"message":"execution reverted","data":"0xaf608abb…0ed2b525841adfc00001…016345785d8a0000"}`. That is `InvalidPrice(70000e18+1, 1e17)`. Simulation from the same account also confirms that off-lot quantity (20001) reverts `InvalidQuantity` and quantity below `minQuantity` reverts `QuantityBelowMinimum`. `getMaxPerpOrderSize` never takes a quantity, but `placePerpOrder` checks neither.

`placePerpOrder` with an off-tick price goes straight to `eth_sendRawTransaction`, with no local grid check and no simulation. The request body is visible in the cause chain in `evidence/10-cause.out.txt`, and its calldata contains price `…0ed2b525841adfc00001`.

## Evidence
- `evidence/05-max.out.txt`: `getMaxPerpOrderSize` results (on-tick, off-tick, 1 wei, 2^255, 2^256, ask side)
- `evidence/06-sim.out.txt`: pool simulation results (`InvalidPrice`, `InvalidQuantity`, `QuantityBelowMinimum`)
- `evidence/09-diag.out.txt`: raw JSON-RPC revert data
- Scripts: `sdk-test/05-max.ts`, `sdk-test/06-sim.ts`, `sdk-test/09-diag.ts`, `sdk-test/10-cause.ts`

## Environment
- `@somnia-chain/markets-sdk` 0.32.1, viem 2.57.7, Node v22.23.3
- Somnia Tokyo / Hideki testnet, chain 50383; BTC-PERP pool `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0`, MarginBank `0x478769E1177C0773c43A593DCCc4Ad15F15F1394`
- Accounts: read-only `eth_call` as public account `0x47537e3a3ea6e9391f3b26ea45618db6828c8bff`; broadcast test from throwaway unfunded key `0xbF603B21b97eaed789653dfD00b166bB3A2C5935` (refused by node, nothing mined)
- Observed 2026-10-21 ~07:30 UTC, block ~29158815
