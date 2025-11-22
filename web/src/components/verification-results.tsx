"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, MapPin, Calendar, Camera, Fingerprint } from "lucide-react";
import { toast } from "sonner";

interface VerificationData {
    status: "verified" | "failed" | "pending";
    timestamp: string;
    location: string;
    deviceId: string;
    signature: string;
    images: {
        left: string;
        right: string;
        depth: string;
    };
}

export function VerificationResults({ cid }: { cid: string }) {
    const [data, setData] = useState<VerificationData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock data fetching
        const fetchData = async () => {
            try {
                await new Promise((resolve) => setTimeout(resolve, 2000));

                // Mock response
                setData({
                    status: "verified",
                    timestamp: new Date().toISOString(),
                    location: "37.7749° N, 122.4194° W",
                    deviceId: "iWitness-Pro-X1",
                    signature: "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
                    images: {
                        left: "https://picsum.photos/seed/left/800/600",
                        right: "https://picsum.photos/seed/right/800/600",
                        depth: "https://picsum.photos/seed/depth/800/600?grayscale",
                    },
                });
            } catch (error) {
                toast.error("Failed to fetch verification data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [cid]);

    if (loading) {
        return <VerificationSkeleton />;
    }

    if (!data) {
        return <div className="text-center text-red-500">Failed to load data</div>;
    }

    return (
        <div className="space-y-6">
            {/* Status Header */}
            <Card className="border-zinc-800 bg-zinc-900/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <CardTitle className="text-xl">Verification Status</CardTitle>
                        <CardDescription>CID: {cid}</CardDescription>
                    </div>
                    <Badge
                        variant={data.status === "verified" ? "default" : "destructive"}
                        className={`text-lg px-4 py-1 ${data.status === "verified" ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : "bg-red-500/20 text-red-500"}`}
                    >
                        {data.status === "verified" ? (
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5" />
                                VERIFIED
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <XCircle className="w-5 h-5" />
                                FAILED
                            </div>
                        )}
                    </Badge>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                        <MetadataItem icon={<Calendar className="w-4 h-4" />} label="Timestamp" value={new Date(data.timestamp).toLocaleString()} />
                        <MetadataItem icon={<MapPin className="w-4 h-4" />} label="Location" value={data.location} />
                        <MetadataItem icon={<Camera className="w-4 h-4" />} label="Device ID" value={data.deviceId} />
                        <MetadataItem icon={<Fingerprint className="w-4 h-4" />} label="Signature" value={data.signature.slice(0, 10) + "..."} />
                    </div>
                </CardContent>
            </Card>

            {/* Images Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardHeader>
                        <CardTitle>Stereo Capture</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="aspect-video relative rounded-lg overflow-hidden border border-zinc-800">
                            <img src={data.images.left} alt="Left Camera" className="object-cover w-full h-full" />
                            <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">Left Eye</div>
                        </div>
                        <div className="aspect-video relative rounded-lg overflow-hidden border border-zinc-800">
                            <img src={data.images.right} alt="Right Camera" className="object-cover w-full h-full" />
                            <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">Right Eye</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardHeader>
                        <CardTitle>Depth Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-[3/4] relative rounded-lg overflow-hidden border border-zinc-800">
                            <img src={data.images.depth} alt="Depth Map" className="object-cover w-full h-full" />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                <p className="text-sm text-zinc-300">
                                    Depth map generated from stereo disparity. Lighter areas are closer, darker areas are further away.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function MetadataItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950/50 border border-zinc-800">
            <div className="text-zinc-400">{icon}</div>
            <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-medium text-zinc-200 truncate max-w-[150px]" title={value}>{value}</p>
            </div>
        </div>
    );
}

function VerificationSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-xl bg-zinc-900" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-[600px] w-full rounded-xl bg-zinc-900" />
                <Skeleton className="h-[600px] w-full rounded-xl bg-zinc-900" />
            </div>
        </div>
    );
}
