import { VerificationResults } from "@/components/verification-results";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VerifyPage({ params }: { params: { cid: string } }) {
    return (
        <main className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight">Verification Report</h1>
                </div>

                <VerificationResults cid={params.cid} />
            </div>
        </main>
    );
}
