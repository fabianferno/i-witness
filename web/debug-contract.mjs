import { createPublicClient, http, getAddress } from "viem";
import { sepolia } from "viem/chains";

const ADDR1 = "0x0635513f179D50A207757E05759CbD106d7dFcE8";
const ADDR2 = "0x0635513f179D50a207757E05759Cbd106D726894"; // Old one
const ADDR3 = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401"; // Docs one

const client = createPublicClient({
    chain: sepolia,
    transport: http(),
});

async function check(addr, name) {
    console.log(`Checking ${name}:`, addr);
    const code = await client.getBytecode({ address: addr });
    console.log("Code length:", code ? code.length : 0);
    if (code && code.length > 2) {
        console.log(`SUCCESS: ${name} exists!`);
    } else {
        console.log(`FAIL: ${name} has no code.`);
    }
}

async function run() {
    await check(ADDR1, "ADDR1 (Search Result)");
    await check(ADDR2, "ADDR2 (Old)");
    await check(ADDR3, "ADDR3 (Docs)");
}

run();
