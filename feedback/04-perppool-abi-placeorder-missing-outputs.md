# Exported `perpPoolWriteAbi.placeOrder` declares no outputs, but the pool returns `(bool success, uint128 orderId)`
Severity: normal
Area: SDK

**Why normal:** the SDK's own `placePerpOrder` path is unaffected, because it reads the order id from logs. But `perpPoolWriteAbi` is a public export, and the developer docs send raw/operator integrators to it ("If you call the pools directly instead of through the SDK…"). They also document the return as `returns (bool success, uint128 orderId)`. With the exported ABI, `simulateContract` returns `result: undefined`. A bot therefore cannot pre-compute the order id or the `success` flag from a simulation, and `decodeFunctionResult` cannot decode the call's return data. `spotPoolWriteAbi.placeOrder` has the same empty outputs, while `spotPoolWriteAbi.amendOrder` does declare its output.

## Steps to reproduce
```ts
import { perpPoolWriteAbi } from "@somnia-chain/markets-sdk"
import { createPublicClient, http, parseUnits, encodeFunctionData, decodeAbiParameters, zeroAddress } from "viem"

console.log("ABI outputs:", JSON.stringify((perpPoolWriteAbi as any).find((x: any) => x.name === "placeOrder").outputs))

const pc = createPublicClient({ transport: http("https://api.hideki2.infra.testnet.somnia.network") })
const pool = "0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0"          // BTC-PERP
const account = "0x47537e3a3ea6e9391f3b26ea45618db6828c8bff"       // any funded account; eth_call only
const args = [true, 0n, parseUnits("70000", 18), 20000n, 2n ** 63n, 0, 0, zeroAddress, 0n] as const

const sim = await pc.simulateContract({ address: pool, abi: perpPoolWriteAbi as any, functionName: "placeOrder", account: account as any, args, gas: 10_000_000n })
console.log("simulateContract result:", sim.result)

const raw = await pc.call({ to: pool, account: account as any, gas: 10_000_000n,
  data: encodeFunctionData({ abi: perpPoolWriteAbi as any, functionName: "placeOrder", args }) })
console.log("raw return:", raw.data)
console.log("decoded as (bool,uint128):", decodeAbiParameters([{ type: "bool" }, { type: "uint128" }], raw.data!))
```

## Expected
`perpPoolWriteAbi` (and `spotPoolWriteAbi`) `placeOrder` should declare `outputs: [{ name: "success", type: "bool" }, { name: "orderId", type: "uint128" }]`, matching the contract and the developer docs. `simulateContract(...).result` would then be `[true, <orderId>]`.

## Actual
```
ABI outputs: []
simulateContract result: undefined
raw return: 0x0000…0001 0000…01830000000000662eb0
decoded as (bool,uint128): [ true, 7138889956525603172016n ]
```
The pool does return 64 bytes, `(true, orderId)`, but the exported ABI drops them. The same check on the other write ABIs shows `perpPoolWriteAbi.cancelOrder []` and `spotPoolWriteAbi.placeOrder []`, while `spotPoolWriteAbi.amendOrder [{"type":"uint128","name":"newOrderId"}]` is complete.

## Evidence
- `evidence/07-raw.out.txt` (raw return data and decode), `evidence/06-sim.out.txt` (`OK … undefined`)
- Scripts: `sdk-test/07-raw.ts`, `sdk-test/06-sim.ts`
- Docs: https://app.testnet.dreamdex.io/docs/developers/perps-testnet ("Raw and operator calls": `placeOrderFor(...) payable returns (bool success, uint128 orderId)`); bot-kit README documents `placeOrder(...) external payable returns (bool success, uint128 orderId)`

## Environment
- `@somnia-chain/markets-sdk` 0.32.1, viem 2.57.7, Node v22.23.3
- Somnia Tokyo / Hideki testnet, chain 50383
- Read-only `eth_call` as public account `0x47537e3a3ea6e9391f3b26ea45618db6828c8bff`; no transaction sent
- Observed 2026-10-21 ~07:30 UTC
