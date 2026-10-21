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
