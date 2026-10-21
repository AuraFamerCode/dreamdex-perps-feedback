# Malformed inputs surface as `RpcError` (retryable) or a raw viem error instead of `InvalidInputError`
Severity: normal
Area: SDK

**Why normal, not major:** the root cause is still the caller's input, and the message text does name the bad value. But the error **class** is wrong, and the class is what the SDK tells integrators to branch on. The SDK documents `InvalidInputError` as "Thrown *before* any network round-trip… Never retry this", and `RpcError` as "the request did not complete… retry with backoff". A bot that follows the official handle-errors recipe will retry these calls forever. One input (price ≥ 2^256) escapes the SDK's error hierarchy completely and lands in the recipe's "not ours" branch.

## Steps to reproduce
```ts
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets, InvalidInputError, RpcError, SomniaMarketsError } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { parseUnits } from "viem"
import { generatePrivateKey } from "viem/accounts"

const m = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql",
  addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES, privateKey: generatePrivateKey() })
const mb = "0x478769E1177C0773c43A593DCCc4Ad15F15F1394"
const pool = "0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0" // BTC-PERP
const show = async (n: string, f: () => Promise<unknown>) => {
  const t0 = Date.now()
  try { await f(); console.log(n, "OK") } catch (e: any) {
    console.log(n, `${Date.now() - t0}ms`, e.constructor.name, "| InvalidInputError?", e instanceof InvalidInputError,
      "| RpcError?", e instanceof RpcError, "| SomniaMarketsError?", e instanceof SomniaMarketsError, "|", e.message.split("\n")[0])
  }
}
await show("getPerpVoucherEligibility(account='0xzz')", () => m.client.getPerpVoucherEligibility(mb, "0xzz" as any))
await show("getMaxPerpOrderSize(account='0x123')", () => m.client.getMaxPerpOrderSize({ pool, marginBank: mb, account: "0x123" as any, isBid: true, price: parseUnits("100000", 18) }))
await show("placePerpOrder(pool='0x12')", () => m.trader.placePerpOrder({ pool: "0x12" as any, isBid: true, price: 10n ** 17n, quantity: 20000n }))
await show("placePerpOrder(price=2^256)", () => m.trader.placePerpOrder({ pool, isBid: true, price: 2n ** 256n, quantity: 20000n }))
// control: the SDK does validate some inputs locally
await show("placePerpOrder(quantity=0)", () => m.trader.placePerpOrder({ pool, isBid: true, price: 10n ** 17n, quantity: 0n }))
process.exit(0)
```

## Expected
Each call rejects with `InvalidInputError` before any network request, the same way `quantity: 0n` already does (`InvalidInputError: price and quantity must be > 0`, 0 ms). Malformed addresses are trivially detectable with viem's `isAddress`, and an out-of-range `uint256` with a bounds check.

## Actual
```
getPerpVoucherEligibility(account='0xzz')  RpcError | @somnia-chain/markets-sdk: rpc readContract getActivePerpPools failed: Address "0xzz" is invalid.
getMaxPerpOrderSize(account='0x123')       RpcError | @somnia-chain/markets-sdk: rpc readContract getReducingCapacity failed: Address "0x123" is invalid.
placePerpOrder(pool='0x12')                RpcError | @somnia-chain/markets-sdk: rpc signTransaction failed: Address "0x12" is invalid.
placePerpOrder(price=2^256)                IntegerOutOfRangeError (viem, NOT a SomniaMarketsError) | Number "1157920892…639936" is not in safe 256-bit unsigned integer range
placePerpOrder(quantity=0)                 InvalidInputError | price and quantity must be > 0   (control: correct)
```

- The address cases are classed as `RpcError`, the documented "retry with backoff" class. `getPerpVoucherEligibility` also makes an unrelated chain read (`getActivePerpPools`) before it fails.
- The `2^256` price case throws viem's own `IntegerOutOfRangeError`. That is outside the SDK hierarchy that "Every SDK error has a concrete class" promises.
- Related: `getMaxPerpOrderSize` with `price: 2n**256n` does not throw at all. It returns `placeable: true` (see report 03).

## Evidence
- Output: `evidence/03-edge.out.txt` (read cases), `evidence/14-misc.out.txt` (write cases), `evidence/08-trader.out.txt` (quantity 0 / price 0 / negative → `InvalidInputError`, 0–1 ms), `evidence/repro-02.out.txt` (output of the exact script above).
- Scripts: `sdk-test/03-edge.ts`, `sdk-test/14-misc.ts`, `sdk-test/08-trader.ts`.
- SDK docs quoted: `dist/errors.d.ts` (`InvalidInputError`: "Thrown before any network round-trip… Never retry this"; `RpcError`: "did not complete"), `docs/how-to/handle-errors.md` ("Retry a read that throws `RpcError`…").

## Environment
- `@somnia-chain/markets-sdk` 0.32.1, viem 2.57.7, Node v22.23.3
- Somnia Tokyo / Hideki testnet, chain 50383 (RPC/WS `api.hideki2.infra.testnet.somnia.network`)
- Wallet: throwaway unfunded key, e.g. `0xFCcE52C1DfbD4f7cA61f74bCCf526a78968498C1`; no transactions
- Observed 2026-10-21 ~07:30 UTC
