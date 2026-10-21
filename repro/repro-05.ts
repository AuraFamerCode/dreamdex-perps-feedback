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
