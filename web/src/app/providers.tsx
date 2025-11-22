"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
    getDefaultConfig,
    RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { sepolia } from "wagmi/chains";
import {
    QueryClientProvider,
    QueryClient,
} from "@tanstack/react-query";
import { JustaNameProvider } from '@justaname.id/react';
import { ChainId } from '@justaname.id/sdk';

const config = getDefaultConfig({
    appName: 'iWitness',
    projectId: 'YOUR_PROJECT_ID', // TODO: Replace with actual Project ID or env var
    chains: [sepolia],
    ssr: true,
});

const queryClient = new QueryClient();

const justanameConfig = {
    config: {
        origin: typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000",
        domain: "iwitness.eth",
    },
    networks: [{ chainId: 11155111 as ChainId, providerUrl: 'https://rpc.sepolia.org' }], // Sepolia
    ensDomains: [
        {
            chainId: 11155111 as ChainId,
            ensDomain: 'iwitness.eth',
            apiKey: process.env.NEXT_PUBLIC_JUSTANAME_API_KEY // User needs to set this
        }
    ],
};

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    <JustaNameProvider config={justanameConfig}>
                        {children}
                    </JustaNameProvider>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
