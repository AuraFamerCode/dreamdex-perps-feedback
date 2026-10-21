# dreamDEX Perps Builder Bounty — Feedback track

Submitted by Kanish Patidar (software engineer, India).

Tested `@somnia-chain/markets-sdk` 0.32.1 on Somnia testnet, plus the dreamDEX bot-kit and docs.
Each issue is one Markdown file in `feedback/` (Title / Severity / Area / Steps to reproduce / Expected / Actual / Evidence / Environment). Repro scripts are in `repro/`.

| # | Issue | Severity |
|---|---|---|
| 01 | SDK reports a node refusal (unfunded signer) as `ContractRevertError: placeOrder reverted: Missing or invalid parameters` | major |
| 02 | Malformed inputs surface as `RpcError` (retryable) or a raw viem error instead of `InvalidInputError` | normal |
| 03 | `getMaxPerpOrderSize` says `placeable: true` for a price off the tick grid, and `placePerpOrder` broadcasts it, but the pool reverts `InvalidPrice` | normal |
| 04 | Exported `perpPoolWriteAbi.placeOrder` declares no outputs, but the pool returns `(bool success, uint128 orderId)` | normal |
| 05 | Perps market table: "Open interest cap" does not match on-chain `maxOpenInterest` (20 of 21 markets), and "account capped at a tenth" is false | normal |
| 06 | SDK's bundled perps docs are stale: "only BTC and ETH perps", symbols that fail with the wrong hint, and a funding guide that points at Shannon | normal |
| 07 | `placePerpOrder` / `PlacePerpOrderParams` JSDoc: wrong funding model and incomplete `orderType` list | normal |
| 08 | API reference: every method lists the same 17 `@throws` with a meaningless boilerplate sentence (959 occurrences), including bridge errors on perp reads | normal |
