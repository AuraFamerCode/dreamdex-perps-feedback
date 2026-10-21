# SDK reports a node refusal (unfunded signer) as `ContractRevertError: placeOrder reverted: Missing or invalid parameters`
Severity: major
Area: SDK

**Why major:** this is the first error almost every new perps developer sees. The docs' Connect snippet runs `claimPerpVoucher` / `placePerpOrder` straight away, and a fresh key has no STT yet. The SDK says the **contract reverted** and tells the developer to "double check you have provided the correct parameters". So they go debugging price, tick, lot and decimals when the real cause is "this account does not exist / has no gas". It also breaks the SDK's documented error contract in a way that changes control flow. `RpcError` is documented as the class for "the node refused a transaction (nonce too low, insufficient funds)", and the handle-errors guide says to retry a `ContractRevertError` only "after the state that caused it changes", decided by `errorName`. Here `errorName` is `undefined` and `data` is the meaningless `0x02`, so the documented recipe ends in the "unrecognised revert" branch. Every write verb is affected: `placePerpOrder`, `claimPerpVoucher` and `cancelOrder` are confirmed.

## Steps to reproduce
1. `npm i @somnia-chain/markets-sdk@0.32.1 viem` (ESM project, `"type": "module"`).
2. Run this with a freshly generated key. It holds no STT, which is exactly what a new developer has:

```ts
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets, RpcError, ContractRevertError } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { parseUnits } from "viem"
import { generatePrivateKey } from "viem/accounts"

const markets = new SomniaMarkets({
  chain: hidekiTestnet,
  indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql",
  addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
  privateKey: generatePrivateKey(),
})
const mb = "0x478769E1177C0773c43A593DCCc4Ad15F15F1394"
const pool = "0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0" // BTC-PERP

for (const [name, f] of [
  ["claimPerpVoucher", () => markets.trader.claimPerpVoucher({ marginBank: mb })],
  ["placePerpOrder",   () => markets.trader.placePerpOrder({ pool, isBid: true, price: parseUnits("70000", 18), quantity: 20000n })],
  ["cancelOrder",      () => (markets.trader as any).cancelOrder({ pool, orderId: 1n })],
] as const) {
  try { await f() } catch (e: any) {
    let c = e; while (c?.cause) c = c.cause
    console.log(name, e.constructor.name, "| RpcError?", e instanceof RpcError,
      "| errorName:", e.errorName, "| data:", e.data, "|", e.message.split("\n")[0], "| root:", c.message)
  }
}
process.exit(0)
```

## Expected
The node refused the transaction at `eth_sendRawTransaction`. Nothing was mined and no EVM revert happened, so per the SDK's own `RpcError` docs:
- the error should be an `RpcError` (or a dedicated "insufficient funds / account not funded" error), not a `ContractRevertError`;
- the message should surface the node's reason (`account does not exist`, meaning the signer needs STT for gas), not viem's generic "Missing or invalid parameters".

## Actual
All three writes throw `ContractRevertError` with `errorName: undefined` and `data: "0x02"`:

```
claimPerpVoucher ContractRevertError | RpcError? false | errorName: undefined | data: 0x02 | @somnia-chain/markets-sdk: claim reverted: Missing or invalid parameters. | root: account does not exist
placePerpOrder   ContractRevertError | RpcError? false | errorName: undefined | data: 0x02 | @somnia-chain/markets-sdk: placeOrder reverted: Missing or invalid parameters. | root: account does not exist
cancelOrder      ContractRevertError | RpcError? false | errorName: undefined | data: 0x02 | @somnia-chain/markets-sdk: cancelOrder reverted: Missing or invalid parameters. | root: account does not exist
```

The cause chain shows the transaction was refused at broadcast and never executed:

```
depth 0: ContractRevertError   data: 0x02   msg: placeOrder reverted: Missing or invalid parameters.
depth 1: InvalidInputRpcError  code: -32000 msg: Missing or invalid parameters.
         URL: wss://api.hideki2.infra.testnet.somnia.network/ws
         Request body: {"method":"eth_sendRawTransaction","params":["0x02f90190..."]}
depth 2: RpcRequestError       code: -32000 data: 0x02
depth 3: {code:-32000, data:"0x02", message:"account does not exist"}
```

For contrast, the node itself returns a correct, decodable revert for the same call when simulated. `eth_call` from the same unfunded address with an off-tick price returns `{"code":3,"message":"execution reverted","data":"0xaf608abb…"}` (`InvalidPrice(price, tick)`). The misleading result comes from the SDK.

**Likely root cause (from the shipped source, `src/revert.ts`):** `isRevert()` returns `true` whenever `findRevertData()` finds *any* hex string in a `data` field on the cause chain. The Somnia node's refusal carries `data: "0x02"`, which passes `isHex`, so a node refusal is classified as a revert. Possible fixes: treat `data` shorter than 4 bytes (no error selector) as not-revert-data, or never classify an `eth_sendRawTransaction` JSON-RPC error with code `-32000` as a revert.

## Evidence
- Full output: `evidence/10-cause.out.txt`, `evidence/11-writes.out.txt`, `evidence/09-diag.out.txt` (raw node responses).
- Scripts: `sdk-test/10-cause.ts`, `sdk-test/11-writes.ts`, `sdk-test/09-diag.ts`.
- No transaction hash exists, because the node refused every broadcast.

## Environment
- `@somnia-chain/markets-sdk` 0.32.1 (npm `latest`, the version the perps developer docs pin), viem 2.57.7, Node v22.23.3, Linux
- Network: Somnia Tokyo / Hideki testnet, chain 50383, RPC `https://api.hideki2.infra.testnet.somnia.network`, WS `wss://api.hideki2.infra.testnet.somnia.network/ws`, indexer `https://hideki-dev.smk.somnia.host/v1/graphql`
- Wallet: throwaway unfunded keys generated per run, e.g. `0x18b6987f6379BD4325CBd67e60EB1De587A14cF0`, `0xbF603B21b97eaed789653dfD00b166bB3A2C5935`
- Observed 2026-10-21 ~07:30 UTC
