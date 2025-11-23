"use client";

import { useState, useEffect } from "react";
import { useAddSubname, useIsSubnameAvailable } from "@justaname.id/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Copy, RefreshCw } from "lucide-react";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { toast } from "sonner";

function RegisterDeviceForm() {
    const [label, setLabel] = useState("");
    const [debouncedLabel, setDebouncedLabel] = useState("");

    // Proper debounce implementation using useEffect
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedLabel(label);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [label]);

    // Hooks can be called here because this component only renders after mount
    const subnameCheck = useIsSubnameAvailable({
        username: debouncedLabel || '',
    });
    const isSubnameAvailable = debouncedLabel ? subnameCheck.isSubnameAvailable : undefined;

    const { addSubname } = useAddSubname();

    const [generatedKey, setGeneratedKey] = useState<{ privateKey: string; address: string } | null>(null);
    const [registrationSuccess, setRegistrationSuccess] = useState<{ fullDomain: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateKey = () => {
        const pk = generatePrivateKey();
        const account = privateKeyToAccount(pk);
        setGeneratedKey({
            privateKey: pk,
            address: account.address,
        });
        setRegistrationSuccess(null);
        setError(null);
    };

    const copyToClipboard = (text: string, description: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${description} copied to clipboard`);
    };

    const handleRegister = async () => {
        if (!generatedKey || !label) return;

        try {
            setError(null);
            await addSubname({
                username: label,
                addresses: { '60': generatedKey.address },
            });
            setRegistrationSuccess({ fullDomain: `${label}.iwitness.eth` });
            toast.success("Device registered successfully!");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to register subname");
            toast.error("Failed to register device");
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md bg-black/10">
                <CardHeader>
                    <CardTitle className="text-zinc-900">Register Device</CardTitle>
                    <CardDescription className="text-zinc-700">
                        Generate a keypair and register an ENS subname for your device.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Step 1: Generate Key */}
                    <div className="space-y-2">
                        <Label>1. Device Identity</Label>
                        {!generatedKey ? (
                            <Button onClick={handleGenerateKey} variant="outline" className="w-full border-dashed">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Generate Device Keypair
                            </Button>
                        ) : (
                            <div className="rounded-md bg-zinc-100 p-3 space-y-3 dark:bg-zinc-800">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-medium text-zinc-500 uppercase">Private Key</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => copyToClipboard(generatedKey.privateKey, "Private Key")}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <code className="block w-full break-all text-xs bg-white dark:bg-black p-2 rounded border border-zinc-200 dark:border-zinc-700 font-mono">
                                        {generatedKey.privateKey}
                                    </code>
                                    <p className="text-[10px] text-red-500 mt-1">
                                        SAVE THIS KEY! It will not be shown again.
                                    </p>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-medium text-zinc-500 uppercase">Address</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => copyToClipboard(generatedKey.address, "Address")}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <code className="block w-full break-all text-xs bg-white dark:bg-black p-2 rounded border border-zinc-200 dark:border-zinc-700 font-mono">
                                        {generatedKey.address}
                                    </code>
                                </div>
                                <Button onClick={handleGenerateKey} variant="ghost" size="sm" className="w-full text-xs h-7">
                                    Regenerate
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Register Subname */}
                    <div className="space-y-2">
                        <Label htmlFor="label">2. Choose Subname</Label>
                        <div className="flex items-center space-x-2">
                            <Input
                                id="label"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                className="focus:ring-0 focus:border-0 focus:ring-offset-0 focus:ring-offset-black/10"
                                placeholder="e.g. camera-01"
                                disabled={!generatedKey || !!registrationSuccess}
                            />
                            <span className="text-sm text-zinc-900">.iwitness.eth</span>
                        </div>
                        {debouncedLabel && (
                            <div className="text-xs h-4">
                                {isSubnameAvailable ? (
                                    <span className="text-green-600 flex items-center">
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Available
                                    </span>
                                ) : (
                                    <span className="text-red-500 flex items-center">
                                        <AlertCircle className="h-3 w-3 mr-1" /> Unavailable
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {registrationSuccess && (
                        <Alert className="border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20">
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertTitle>Success!</AlertTitle>
                            <AlertDescription>
                                Registered <strong>{registrationSuccess.fullDomain}</strong> to device.
                            </AlertDescription>
                        </Alert>
                    )}

                    <Button
                        onClick={handleRegister}
                        className="w-full"
                        disabled={!generatedKey || !label || !isSubnameAvailable || !!registrationSuccess}
                    >
                        Register Device
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

function RegisterDeviceContent() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md bg-black/10">
                    <CardHeader>
                        <CardTitle className="text-zinc-900">Register Device</CardTitle>
                        <CardDescription className="text-zinc-700">
                            Loading...
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return <RegisterDeviceForm />;
}

export default RegisterDeviceContent;

