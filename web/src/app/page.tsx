import { VerificationForm } from "@/components/verification-form";
import { RecentPirls } from "@/components/recent-pirls";
import { Shield, Camera, Lock } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex flex-col gap-12">
        <div className="text-center space-y-6 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800 text-white text-xs uppercase tracking-wider mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            System Online
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-900">
            <img src="/logo.png" alt="iWitness Logo" className="h-24  md:h-32 mx-auto opacity-80" />iWitness
          </h1>

          <p className="text-zinc-900 text-lg md:text-xl leading-relaxed">
            Cryptographic proof of physical reality. Verify the authenticity of images and depth data secured by hardware-attested signatures.
          </p>
        </div>

        <VerificationForm />

        <RecentPirls />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-12">
          <FeatureCard
            icon={<Camera className="w-6 h-6 text-zinc-200" />}
            title="Stereo Capture"
            description="Dual-camera setup captures synchronized frames to generate depth maps."
          />
          <FeatureCard
            icon={<Lock className="w-6 h-6 text-zinc-200" />}
            title="Hardware Signed"
            description="Raw data is signed inside the Secure Enclave for tamper-proof evidence."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6 text-zinc-200" />}
            title="Verifiable"
            description="Anyone can verify the signature and depth consistency on-chain."
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-xl bg-black/10 border border-zinc-800/40 backdrop-blur-sm hover:bg-zinc-900/30 transition-colors">
      <div className="mb-4 p-3 rounded-lg bg-black/50 w-fit border border-zinc-800">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-black mb-2">{title}</h3>
      <p className="text-zinc-900 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
