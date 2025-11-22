import { Synapse } from "@filoz/synapse-sdk";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("PRIVATE_KEY not found");
    }

    const synapse = await Synapse.create({
        privateKey,
        rpcURL: "https://api.calibration.node.glif.io/rpc/v1",
    });

    console.log("Getting storage info...");
    const info = await synapse.storage.getStorageInfo();
    console.log("Providers:", info.providers.length);

    for (const p of info.providers) {
        console.log('Provider:', p.name);
        console.log('PDP Data:', p.products.PDP?.data);


    }
}

main().catch(console.error);
