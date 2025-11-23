import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";


export function Header() {
    return (
        <header className="sticky top-2 z-50 w-full border-b border-zinc-800/40 rounded-full max-w-2xl mx-auto bg-black/10 backdrop-blur-xl supports-backdrop-filter:bg-black/5">
            <div className="container flex h-14 max-w-7xl mx-auto items-center justify-center">
                <nav className="flex items-center justify-center gap-2 text-sm font-medium">
                    <Link
                        href="/"
                        className="transition-colors font-bold hover:text-zinc-900/80 text-zinc-900"
                    >
                        <Image
                            src="/logo.png"
                            alt="iWitness Logo"
                            width={40}
                            height={40}
                            className="h-10 w-10 md:h-12 md:w-12 mx-auto opacity-80"
                        />
                    </Link>
                    <Link
                        href="/register-device"
                        className="transition-colors font-bold hover:text-zinc-900/80 text-zinc-900"
                    >
                        Register Device
                    </Link>
                </nav>

            </div>
        </header>
    );
}
