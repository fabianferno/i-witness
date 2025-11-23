"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Copy, RefreshCw } from "lucide-react";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { toast } from "sonner";
import { setNameSubname, checkSubnameAvailability, getNames, NameData } from "@/lib/namestone";
import { Badge } from "@/components/ui/badge";

const primaryDomain = "iwitness.eth";

function RegisterDeviceForm() {
    const [label, setLabel] = useState("");
    const [debouncedLabel, setDebouncedLabel] = useState("");
    const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
    const [isSubnameAvailable, setIsSubnameAvailable] = useState<boolean | undefined>(undefined);
    const [isRegistering, setIsRegistering] = useState(false);
    const [existingSubnames, setExistingSubnames] = useState<NameData[]>([]);
    const [isLoadingSubnames, setIsLoadingSubnames] = useState(false);

    // Proper debounce implementation using useEffect
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedLabel(label);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [label]);

    // Fetch existing subnames on mount
    useEffect(() => {
        const fetchSubnames = async () => {
            setIsLoadingSubnames(true);
            try {
                const response = await getNames({ domain: primaryDomain });
                if (response.success && response.data) {
                    setExistingSubnames(response.data);
                }
            } catch (error) {
                console.error('Error fetching subnames:', error);
            } finally {
                setIsLoadingSubnames(false);
            }
        };

        fetchSubnames();
    }, []);

    // Check availability when debounced label changes
    useEffect(() => {
        const checkAvailability = async () => {
            if (!debouncedLabel || debouncedLabel.length === 0) {
                setIsSubnameAvailable(undefined);
                return;
            }

            setIsCheckingAvailability(true);
            try {
                const available = await checkSubnameAvailability(debouncedLabel, primaryDomain);
                setIsSubnameAvailable(available);
            } catch (error) {
                console.error('Availability check error:', error);
                setIsSubnameAvailable(false);
            } finally {
                setIsCheckingAvailability(false);
            }
        };

        checkAvailability();
    }, [debouncedLabel]);

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

        setIsRegistering(true);
        setError(null);

        try {
            await setNameSubname(
                label,
                generatedKey.address,
                primaryDomain
            );

            setRegistrationSuccess({ fullDomain: `${label}.${primaryDomain}` });
            toast.success("Device registered successfully!");

            // Refresh the subnames list
            const response = await getNames({ domain: primaryDomain });
            if (response.success && response.data) {
                setExistingSubnames(response.data);
            }
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : "Failed to register subname";
            setError(errorMessage);
            toast.error("Failed to register device");
        } finally {
            setIsRegistering(false);
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
                            <span className="text-sm text-zinc-900">.{primaryDomain}</span>
                        </div>
                        {debouncedLabel && (
                            <div className="text-xs h-4">
                                {isCheckingAvailability ? (
                                    <span className="text-zinc-500 flex items-center">
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Checking availability...
                                    </span>
                                ) : isSubnameAvailable === true ? (
                                    <span className="text-green-600 flex items-center">
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Available
                                    </span>
                                ) : isSubnameAvailable === false ? (
                                    <span className="text-red-500 flex items-center">
                                        <AlertCircle className="h-3 w-3 mr-1" /> Unavailable or invalid
                                    </span>
                                ) : null}
                            </div>
                        )}
                    </div>

                    {/* Existing Subnames */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Existing Subnames ({existingSubnames.length})</Label>
                            {isLoadingSubnames && (
                                <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
                            )}
                        </div>
                        {existingSubnames.length > 0 ? (
                            <div className="rounded-md bg-zinc-100 p-3 dark:bg-zinc-800 max-h-48 overflow-y-auto">
                                <div className="flex flex-wrap gap-2">
                                    {existingSubnames.map((subname, index) => (
                                        <Badge
                                            key={index}
                                            variant="secondary"
                                            className="text-xs font-mono"
                                        >
                                            {subname.name}.{primaryDomain}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-md bg-zinc-100 p-3 text-sm text-zinc-500 dark:bg-zinc-800">
                                {isLoadingSubnames ? 'Loading...' : 'No subnames registered yet'}
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
                        disabled={!generatedKey || !label || isSubnameAvailable !== true || !!registrationSuccess || isRegistering}
                    >
                        {isRegistering ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Registering...
                            </>
                        ) : (
                            'Register Device'
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

function RegisterDeviceContent() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Use requestAnimationFrame to avoid synchronous setState in effect
        requestAnimationFrame(() => {
            setMounted(true);
        });
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

