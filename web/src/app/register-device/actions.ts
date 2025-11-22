"use server";

import { createWalletClient, http, publicActions, namehash, keccak256, toHex, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

// ENS NameWrapper on Sepolia
const NAME_WRAPPER_ADDRESS = "0x0635513f179D50A207757E05759CbD106d7dFcE8";
// Public Resolver on Sepolia
const PUBLIC_RESOLVER_ADDRESS = "0x8FADE66B79cC9f707aB26799354482EB93a5B7dD";

const PARENT_DOMAIN = "iwitness.eth";

export type State = {
    error?: string;
    success?: boolean;
    txHash?: string;
    fullDomain?: string;
};

export async function registerDevice(prevState: State, formData: FormData): Promise<State> {
    const label = formData.get("label") as string;
    const deviceAddress = formData.get("address") as string;

    if (!label || !deviceAddress) {
        return { error: "Label and Device Address are required." };
    }

    if (!process.env.PRIVATE_KEY) {
        return { error: "Server configuration error: PRIVATE_KEY not found." };
    }

    try {
        let privateKey = process.env.PRIVATE_KEY;
        if (!privateKey.startsWith("0x")) {
            privateKey = `0x${privateKey}`;
        }
        const account = privateKeyToAccount(privateKey as `0x${string}`);
        const client = createWalletClient({
            account,
            chain: sepolia,
            transport: http(),
        }).extend(publicActions);

        const expiry = 1893456000n; // Jan 1 2030
        const fuses = 65536; // CANNOT_UNWRAP

        // Fetch parent expiry
        const parentNode = namehash(PARENT_DOMAIN);
        const [parentOwner, parentFuses, parentExpiry] = await client.readContract({
            address: NAME_WRAPPER_ADDRESS,
            abi: [
                {
                    inputs: [{ name: "id", type: "uint256" }],
                    name: "getData",
                    outputs: [
                        { name: "owner", type: "address" },
                        { name: "fuses", type: "uint32" },
                        { name: "expiry", type: "uint64" },
                    ],
                    stateMutability: "view",
                    type: "function",
                },
            ],
            functionName: "getData",
            args: [BigInt(parentNode)],
        });

        // Use parent expiry for subname
        const subnameExpiry = parentExpiry;

        const { request } = await client.simulateContract({
            address: NAME_WRAPPER_ADDRESS,
            abi: [
                {
                    inputs: [
                        { name: "parentNode", type: "bytes32" },
                        { name: "label", type: "string" },
                        { name: "owner", type: "address" },
                        { name: "resolver", type: "address" },
                        { name: "ttl", type: "uint64" },
                        { name: "fuses", type: "uint32" },
                        { name: "expiry", type: "uint64" },
                    ],
                    name: "setSubnodeRecord",
                    outputs: [{ name: "", type: "bytes32" }],
                    stateMutability: "nonpayable",
                    type: "function",
                },
                {
                    inputs: [{ name: "node", type: "bytes32" }],
                    name: "OperationProhibited",
                    type: "error",
                },
            ],
            functionName: "setSubnodeRecord",
            args: [
                parentNode,
                label,
                deviceAddress as `0x${string}`,
                PUBLIC_RESOLVER_ADDRESS,
                0n, // TTL
                fuses,
                subnameExpiry,
            ],
        });

        const hash = await client.writeContract(request);

        return { success: true, txHash: hash, fullDomain: `${label}.${PARENT_DOMAIN}` };
    } catch (error: any) {
        console.error("Registration error:", error);
        return { error: error.message || "Failed to register device." };
    }
}
