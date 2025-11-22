"use client";

import { useActionState } from "react";
import { registerDevice, type State } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const initialState: State = {
    error: "",
    success: false,
    txHash: "",
    fullDomain: "",
};

export default function RegisterDevicePage() {
    const [state, formAction, isPending] = useActionState(registerDevice, initialState);

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/50">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Register Device</CardTitle>
                    <CardDescription>
                        Register a new ENS subname for your device under <strong>iwitness.eth</strong>.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="label">Subname Label</Label>
                            <div className="flex items-center space-x-2">
                                <Input
                                    id="label"
                                    name="label"
                                    placeholder="e.g. camera-01"
                                    required
                                    pattern="[a-z0-9-]+"
                                    title="Only lowercase alphanumeric characters and hyphens are allowed."
                                />
                                <span className="text-sm text-muted-foreground">.iwitness.eth</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">Device Address</Label>
                            <Input
                                id="address"
                                name="address"
                                placeholder="0x..."
                                required
                                pattern="^0x[a-fA-F0-9]{40}$"
                                title="Must be a valid Ethereum address starting with 0x."
                            />
                        </div>

                        {state.error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{state.error}</AlertDescription>
                            </Alert>
                        )}

                        {state.success && (
                            <Alert className="border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertTitle>Success!</AlertTitle>
                                <AlertDescription>
                                    Registered <strong>{state.fullDomain}</strong>
                                    <br />
                                    <a
                                        href={`https://sepolia.etherscan.io/tx/${state.txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline hover:text-green-800"
                                    >
                                        View Transaction
                                    </a>
                                </AlertDescription>
                            </Alert>
                        )}

                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Registering...
                                </>
                            ) : (
                                "Register Device"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
