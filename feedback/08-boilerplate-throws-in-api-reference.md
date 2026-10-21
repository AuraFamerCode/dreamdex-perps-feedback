# API reference: every method lists the same 17 `@throws` with a meaningless boilerplate sentence (959 occurrences), including bridge errors on perp reads
Severity: normal
Area: SDK (docs / typings)

**Why normal:** this affects developer experience, not behaviour. Error handling is where perps bots most need accurate docs, and the SDK markets its typed error classes. But the generated `@throws` blocks give no per-method information. Every method, including pure perps reads like `getMaxPerpOrderSize` and writes like `placePerpOrder`, lists all 17 error classes with one identical sentence: "A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity." The list includes `BridgeLiquidityError`, `BridgeDeliveryTimeoutError`, `CollateralOnWrongChainError` and `FillHistoryRestartRequiredError`, which cannot come from a perp order. The useful hand-written lines ("- Throws `ContractRevertError` - …") are buried under them. The sentence is also wrong for write methods: `placePerpOrder` is not a "chain read", and its variant reads "A supplied owner RPC constructor or socket member raises this SDK error".

## Steps to reproduce
```bash
npm i @somnia-chain/markets-sdk@0.32.1
cd node_modules/@somnia-chain/markets-sdk
grep -c "A supplied RPC constructor or socket interrupts this chain read with this SDK error" dist/*.d.ts | awk -F: '{s+=$2} END {print s}'
grep -n "getMaxPerpOrderSize(p: {" -B22 dist/somniaMarketsClient.d.ts | grep "@throws"
grep -n "placePerpOrder(params" -B20 dist/trade.d.ts | grep "@throws"
```

## Expected
Each method's `@throws` lists only the classes it can actually throw, with a reason specific to that method. For example, `getMaxPerpOrderSize`: `InvalidInputError` (price ≤ 0), `ContractRevertError` (pool or bank read reverted), `RpcError` (transport). Bridge and fill-history errors do not appear on perp methods.

## Actual
- 959 identical "interrupts this chain read" lines across `dist/*.d.ts`.
- `getMaxPerpOrderSize` lists 17 `@throws`, each with that sentence, including `BridgeLiquidityError`, `BridgeDeliveryTimeoutError`, `CollateralOnWrongChainError`, `FillHistoryRestartRequiredError`, `FillHistoryUnavailableError` and `IncompleteHistoryError`.
- `placePerpOrder` has one meaningful line ("Throws `NotConfiguredError` - the executor has no chain transport.") followed by 17 copies of "A supplied owner RPC constructor or socket member raises this SDK error. Its identity is retained."
- The same text appears in IDE hovers and in the hosted TypeDoc reference generated from these sources.

## Evidence
- Package files: `dist/somniaMarketsClient.d.ts` (around `getMaxPerpOrderSize`, line ~3490), `dist/trade.d.ts` (around `placePerpOrder`, line ~2729)
- Count command output: `959`

## Environment
- `@somnia-chain/markets-sdk` 0.32.1, Node v22.23.3
- No network or wallet needed
- Observed 2026-10-21
