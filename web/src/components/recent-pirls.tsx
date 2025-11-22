"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import Link from "next/link";

interface Pirl {
    id: string;
    cid: string;
    imageUrl: string;
    timestamp: string;
    score: number;
    status: "verified" | "suspicious" | "failed";
}

const RECENT_PIRLS: Pirl[] = [
    {
        id: "1",
        cid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
        imageUrl: "https://picsum.photos/seed/pirl1/400/300",
        timestamp: "2 mins ago",
        score: 0.98,
        status: "verified",
    },
    {
        id: "2",
        cid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdj",
        imageUrl: "https://picsum.photos/seed/pirl2/400/300",
        timestamp: "15 mins ago",
        score: 0.45,
        status: "suspicious",
    },
    {
        id: "3",
        cid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdk",
        imageUrl: "https://picsum.photos/seed/pirl3/400/300",
        timestamp: "1 hour ago",
        score: 0.92,
        status: "verified",
    },
    {
        id: "4",
        cid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdl",
        imageUrl: "https://picsum.photos/seed/pirl4/400/300",
        timestamp: "3 hours ago",
        score: 0.12,
        status: "failed",
    },
];

export function RecentPirls() {
    return (
        <div className="w-full max-w-5xl space-y-6 my-24">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-zinc-900">Recent PIRLs</h2>
                <div className="text-sm text-zinc-500">Live Feed</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {RECENT_PIRLS.map((pirl) => (
                    <Link href={`/verify/${pirl.cid}`} key={pirl.id}>
                        <Card className="bg-black/10 py-0 border-zinc-800 hover:bg-black/20 transition-all cursor-pointer overflow-hidden group">
                            <CardContent className="p-0">
                                <div className="relative aspect-[4/3] overflow-hidden">
                                    <img
                                        src={pirl.imageUrl}
                                        alt={`PIRL ${pirl.id}`}
                                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute top-2 right-2">
                                        <StatusBadge status={pirl.status} />
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-xs text-zinc-200 font-mono">{pirl.timestamp}</p>
                                                <p className="text-xs text-zinc-400 font-mono truncate w-24">{pirl.cid.slice(0, 8)}...</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-zinc-100 uppercase">Liveness Score</p>
                                                <p className={`text-sm font-bold ${getScoreColor(pirl.score)}`}>
                                                    {(pirl.score * 100).toFixed(0)}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 border-t border-zinc-800/50">
                                    <p className="text-xs text-black leading-relaxed">
                                        {getStatusDescription(pirl.status, pirl.score)}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: Pirl["status"] }) {
    switch (status) {
        case "verified":
            return (
                <Badge className="bg-black/70 text-green-200 border-green-500/30 hover:bg-green-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                </Badge>
            );
        case "suspicious":
            return (
                <Badge className="bg-black/70 text-yellow-200 border-yellow-500/30 hover:bg-yellow-500/30">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Suspicious
                </Badge>
            );
        case "failed":
            return (
                <Badge className="bg-black/70 text-red-200 border-red-500/30 hover:bg-red-500/30">
                    <XCircle className="w-3 h-3 mr-1" /> Failed
                </Badge>
            );
    }
}

function getScoreColor(score: number) {
    if (score >= 0.8) return "text-green-400";
    if (score >= 0.5) return "text-yellow-400";
    return "text-red-400";
}

function getStatusDescription(status: Pirl["status"], score: number) {
    if (status === "verified") return "Cryptographically signed and depth-verified.";
    if (status === "suspicious") return "Signature valid but depth map inconsistencies detected.";
    return "Likely AI-generated or screen recording. Low liveness score.";
}
