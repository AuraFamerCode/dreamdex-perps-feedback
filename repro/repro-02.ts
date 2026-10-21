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
