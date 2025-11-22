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
    const info = await synapse.getStorageInfo();
    console.log("Providers:", info.providers.length);

    for (const p of info.providers) {
        console.log(`\nProvider ID: ${p.owner} (Owner?)`);
        console.log(`Address: ${p.owner}`);
        console.log(`PDP URL: ${p.pdpUrl}`);
        console.log(`Retrieval URL: ${p.pieceRetrievalUrl}`);

        // Try to fetch PDP URL to see if it's reachable
        try {
            const res = await fetch(p.pdpUrl);
            console.log(`PDP Ping: ${res.status} ${res.statusText}`);
        } catch (e: any) {
            console.log(`PDP Ping Failed: ${e.message}`);
        }
    }
}

main().catch(console.error);
