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

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30000, // 30 seconds
        },
    },
});

function ClientProviders({ children }: { children: React.ReactNode }) {
    const [config] = useState(() => {
        return getDefaultConfig({
            appName: 'iWitness',
            projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
            chains: [sepolia],
            ssr: true,
            storage: createStorage({
                storage: cookieStorage,
            }),
        });
    });

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}

export function Providers({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Use setTimeout to defer state update and avoid hydration mismatch
        const timer = setTimeout(() => {
            setMounted(true);
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    // During SSR and initial client render, return children without providers
    // This ensures server and client render the same HTML initially
    if (!mounted) {
        return <>{children}</>;
    }

    // After mount, render with providers
    return <ClientProviders>{children}</ClientProviders>;
}
