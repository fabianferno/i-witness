"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { useState, useEffect } from "react";
import {
    getDefaultConfig,
    RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider, cookieStorage, createStorage } from "wagmi";
import { sepolia } from "wagmi/chains";
import {
    QueryClientProvider,
    QueryClient,
} from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { ChainId } from '@justaname.id/sdk';

const queryClient = new QueryClient();

const JustaNameProvider = dynamic(
    () => import('@justaname.id/react').then((mod) => mod.JustaNameProvider),
    { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    const [config, setConfig] = useState<ReturnType<typeof getDefaultConfig> | null>(null);
    const [justanameConfig, setJustanameConfig] = useState<{
        config: { origin: string; domain: string };
        networks: Array<{ chainId: ChainId; providerUrl: string }>;
        ensDomains: Array<{ chainId: ChainId; ensDomain: string; apiKey?: string }>;
    } | null>(null);

    useEffect(() => {
        setMounted(true);
        // Create config only on client side after mount to avoid SSR issues
        if (typeof window !== 'undefined') {
            setConfig(getDefaultConfig({
                appName: 'iWitness',
                projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
                chains: [sepolia],
                ssr: true,
                storage: createStorage({
                    storage: cookieStorage,
                }),
            }));

            setJustanameConfig({
                config: {
                    origin: window.location.origin,
                    domain: "iwitness.eth",
                },
                networks: [{ chainId: 11155111 as ChainId, providerUrl: 'https://rpc.sepolia.org' }],
                ensDomains: [
                    {
                        chainId: 11155111 as ChainId,
                        ensDomain: 'iwitness.eth',
                        apiKey: process.env.NEXT_PUBLIC_JUSTANAME_API_KEY
                    }
                ],
            });
        }
    }, []);

    if (!mounted || !config || !justanameConfig) {
        return <>{children}</>;
    }

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
