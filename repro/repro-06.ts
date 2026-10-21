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
