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
