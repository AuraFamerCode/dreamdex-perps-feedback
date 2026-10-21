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
