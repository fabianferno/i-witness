"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export function VerificationForm() {
    const [cid, setCid] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cid) {
            toast.error("Please enter a valid IPFS CID");
            return;
        }

        // Sanitize CID: remove ipfs:// prefix and trim whitespace
        const cleanCid = cid.replace("ipfs://", "").trim();

        if (!cleanCid) {
            toast.error("Please enter a valid IPFS CID");
            return;
        }

        setIsLoading(true);
        // Mock verification delay
        setTimeout(() => {
            setIsLoading(false);
            toast.success("Verification started for CID: " + cleanCid);
            router.push(`/verify/${encodeURIComponent(cleanCid)}`);
        }, 2000);
    };

    return (
        <Card className="w-full max-w-md mx-auto border-zinc-800 bg-black/10 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-900">
                    <ShieldCheck className="w-5 h-5 text-green-900" />
                    Verify Capture
                </CardTitle>
                <CardDescription className="text-zinc-900">
                    Enter the IPFS CID of the capture package to verify its authenticity.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleVerify}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            placeholder="ipfs://bafy..."
                            value={cid}
                            onChange={(e) => setCid(e.target.value)}
                            className="bg-zinc-900/50 mb-4 border-zinc-800 text-zinc-100 placeholder:text-zinc-400 focus-visible:ring-indigo-500/50"
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        type="submit"
                        className="w-full bg-black hover:bg-zinc-800 text-zinc-200 font-medium"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            "Verify Proof"
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
