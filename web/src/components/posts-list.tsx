"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Database, Clock, FileText, Download, Loader2, Image as ImageIcon, Info, Hash, Layers, Activity, Maximize2, Minimize2, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { verifySignature, addMetadataToPng } from "@/lib/utils";
import { useEnsName } from "wagmi";
import { sepolia } from "viem/chains";

interface Post {
  _id: string;
  hash: string;
  createdAt: string;
  size?: number;
  originalName?: string;
  mimeType?: string;
  signature?: string;
  [key: string]: unknown;
}

interface DepthData {
  shape: number[];
  dtype: string;
  min: number;
  max: number;
  mean: number;
  valid_pixels: number;
}

interface ContentData {
  data?: {
    timestamp?: number;
    baseImage?: string;
    depthImage?: string;
    depthData?: DepthData;
  };
  signature?: string;
}

export function PostsList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/posts?limit=10');
        const data = await response.json();

        if (data.success) {
          setPosts(data.data);
        } else {
          setError(data.message || 'Failed to fetch posts');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch posts');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-zinc-900/50 border-zinc-800 animate-pulse">
              <CardContent className="p-0">
                <div className="h-48 bg-zinc-800/50 w-full" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-zinc-800/50 rounded w-3/4" />
                  <div className="h-3 bg-zinc-800/30 rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4">
            <p className="text-red-200">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-12 text-center">
            <Database className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-500">No posts found. Uploads will appear here once files are uploaded to Filecoin.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 mt-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <PostCard key={post._id} post={post} />
        ))}
      </div>
    </div>
  );
}


function PostCard({ post }: { post: Post }) {
  const [contentData, setContentData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveredAddress, setRecoveredAddress] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const { data: ensName } = useEnsName({
    address: recoveredAddress as `0x${string}`,
    chainId: sepolia.id,
  });

  useEffect(() => {
    const fetchContent = async () => {
      if (!post.hash) return;

      setLoading(true);
      try {
        const response = await fetch(`/api/download/${post.hash}`);
        const data = await response.json();

        if (data.success) {
          setContentData(data.data);
        } else {
          setError(data.error || 'Failed to fetch content');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch content');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [post.hash]);

  useEffect(() => {
    if (contentData?.data && contentData?.signature) {
      const address = verifySignature(contentData.data, contentData.signature);
      setRecoveredAddress(address);
    }
  }, [contentData]);

  const handleDownload = async () => {
    if (!contentData?.data?.baseImage) return;

    setDownloading(true);
    try {
      // Create image from base64
      const img = new Image();
      img.src = `data:image/png;base64,${contentData.data.baseImage}`;
      await new Promise((resolve) => { img.onload = resolve; });

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Add Watermark
      const fontSize = Math.max(20, Math.floor(img.width * 0.05));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = fontSize / 10;

      const text = "#PIRL";
      const padding = fontSize;

      ctx.strokeText(text, padding, padding + fontSize);
      ctx.fillText(text, padding, padding + fontSize);

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("Could not create image blob");

      // Add Metadata
      const blobWithMetadata = await addMetadataToPng(blob, "CID", post.hash);

      // Download
      const url = URL.createObjectURL(blobWithMetadata);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${post.originalName || 'image'}-pirl.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Card className="bg-black/10 py-0 border-zinc-800 hover:bg-black/20 transition-all overflow-hidden group flex flex-col h-full">
      <div className="relative aspect-[4/3] w-full bg-zinc-900/50 overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
          </div>
        ) : contentData?.data?.baseImage ? (
          <img
            src={`data:image/png;base64,${contentData.data.baseImage}`}
            alt="Base content"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
            <ImageIcon className="w-8 h-8 opacity-20" />
          </div>
        )}

        {/* Status Badge - Top Right */}
        <div className="absolute top-2 right-2 flex gap-2">
          {recoveredAddress ? (
            <Badge className="bg-black/70 text-green-200 border-green-500/30 backdrop-blur-md shadow-sm hover:bg-green-500/30">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
            </Badge>
          ) : post.signature ? (
            <Badge className="bg-black/70 text-emerald-300 border-emerald-500/30 backdrop-blur-md shadow-sm">
              Signed
            </Badge>
          ) : null}
        </div>

        {/* Gradient Overlay - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-12">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs text-zinc-200 font-mono mb-0.5">{formatDate(post.createdAt)}</p>
              <p className="text-xs text-zinc-400 font-mono truncate w-32">{post.hash}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                disabled={downloading}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md shadow-lg transition-all"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              </Button>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md shadow-lg transition-all"
                  >
                    <Info className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 bg-zinc-950 border-zinc-800 overflow-hidden flex flex-col">
                  <DialogHeader className="p-6 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                        <FileText className="w-5 h-5 text-zinc-100" />
                      </div>
                      <div>
                        <DialogTitle className="text-xl font-semibold text-zinc-100">
                          {post.originalName || 'Content Details'}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400 font-mono text-xs mt-1 flex items-center gap-2">
                          <Hash className="w-3 h-3" />
                          {post.hash}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-6">
                      {loading && (
                        <div className="flex flex-col items-center justify-center py-20">
                          <Loader2 className="w-8 h-8 animate-spin text-zinc-500 mb-4" />
                          <span className="text-zinc-500">Loading content details...</span>
                        </div>
                      )}

                      {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex items-center gap-4">
                          <div className="p-3 bg-red-500/20 rounded-full">
                            <Activity className="w-6 h-6 text-red-400" />
                          </div>
                          <div>
                            <h4 className="text-red-200 font-medium">Failed to load content</h4>
                            <p className="text-red-300/70 text-sm mt-1">{error}</p>
                          </div>
                        </div>
                      )}

                      {contentData && !loading && (
                        <ContentDisplay data={contentData} />
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-3 border-t border-zinc-800/50 bg-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <FileText className="w-3 h-3 text-zinc-500 shrink-0" />
            <p className="text-xs text-zinc-300 truncate font-medium">
              {ensName || post.originalName || 'Untitled'}
            </p>
          </div>
          {post.size && (
            <span className="text-[10px] text-zinc-500 font-mono shrink-0">
              {formatFileSize(post.size)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Component to display content with images and charts
function ContentDisplay({ data }: { data: ContentData }) {
  const depthData = data.data?.depthData;
  const baseImage = data.data?.baseImage;
  const depthImage = data.data?.depthImage;
  const timestamp = data.data?.timestamp;
  const signature = data.signature;
  const [isJsonOpen, setIsJsonOpen] = useState(false);
  const [recoveredAddress, setRecoveredAddress] = useState<string | null>(null);

  useEffect(() => {
    if (data.data && data.signature) {
      const address = verifySignature(data.data, data.signature);
      setRecoveredAddress(address);
    }
  }, [data]);

  // Prepare chart data for depth statistics
  const depthStatsData = depthData ? [
    { name: 'Min', value: depthData.min, color: '#3b82f6' },
    { name: 'Max', value: depthData.max, color: '#ef4444' },
    { name: 'Mean', value: depthData.mean, color: '#10b981' },
  ] : [];

  // Calculate valid pixels percentage
  const totalPixels = depthData?.shape ? depthData.shape[0] * depthData.shape[1] : 0;
  const validPixelsPercentage = depthData && totalPixels > 0
    ? (depthData.valid_pixels / totalPixels) * 100
    : 0;

  const pixelData = [
    { name: 'Valid', value: depthData?.valid_pixels || 0, color: '#10b981' },
    { name: 'Invalid', value: (totalPixels - (depthData?.valid_pixels || 0)), color: '#3f3f46' },
  ];

  const COLORS = ['#10b981', '#3f3f46'];

  return (
    <div className="space-y-8">
      {/* Images Section */}
      {(baseImage || depthImage) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {baseImage && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Base Image
                </h3>
                <Badge variant="outline" className="bg-zinc-900 text-zinc-500 border-zinc-800">RGB</Badge>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden aspect-video relative group">
                <img
                  src={`data:image/png;base64,${baseImage}`}
                  alt="Base image"
                  className="w-full h-full object-contain bg-black/20"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl pointer-events-none" />
              </div>
            </div>
          )}
          {depthImage && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Depth Map
                </h3>
                <Badge variant="outline" className="bg-zinc-900 text-zinc-500 border-zinc-800">Depth</Badge>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden aspect-video relative group">
                <img
                  src={`data:image/png;base64,${depthImage}`}
                  alt="Depth image"
                  className="w-full h-full object-contain bg-black/20"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Depth Data Statistics */}
      {depthData && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b border-zinc-800/50">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-zinc-100">Depth Analysis</h3>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard label="Dimensions" value={depthData.shape.join(' × ')} icon={<Maximize2 className="w-3 h-3" />} />
            <StatsCard label="Data Type" value={depthData.dtype} icon={<Database className="w-3 h-3" />} />
            <StatsCard label="Valid Pixels" value={depthData.valid_pixels.toLocaleString()} icon={<Activity className="w-3 h-3" />} />
            <StatsCard label="Coverage" value={`${validPixelsPercentage.toFixed(1)}%`} icon={<PieChart className="w-3 h-3" />} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Depth Statistics Bar Chart */}
            {depthStatsData.length > 0 && (
              <Card className="bg-zinc-900/30 border-zinc-800/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Value Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={depthStatsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                          cursor={{ fill: '#27272a' }}
                          contentStyle={{
                            backgroundColor: '#18181b',
                            border: '1px solid #27272a',
                            borderRadius: '8px',
                            color: '#f4f4f5',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                          {depthStatsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Valid Pixels Pie Chart */}
            {pixelData.length > 0 && totalPixels > 0 && (
              <Card className="bg-zinc-900/30 border-zinc-800/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Data Quality</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pixelData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {pixelData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            border: '1px solid #27272a',
                            borderRadius: '8px',
                            color: '#f4f4f5',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Metadata & Signature */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Timestamp
          </h3>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-200 font-mono text-sm">
              {timestamp ? new Date(timestamp).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Signature
            {recoveredAddress && (
              <Badge className="ml-auto bg-emerald-500/20 text-emerald-300 border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </Badge>
            )}
          </h3>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 group relative overflow-hidden space-y-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Signer</span>
              <p className="text-zinc-200 font-mono text-xs break-all">
                {recoveredAddress || 'Verifying...'}
              </p>
            </div>
            <div className="flex flex-col gap-1 border-t border-zinc-800/50 pt-2">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Signature Hash</span>
              <p className="text-zinc-400 font-mono text-[10px] break-all opacity-70 group-hover:opacity-100 transition-opacity">
                {signature || 'No signature available'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Raw JSON (collapsible) */}
      <div className="border-t border-zinc-800/50 pt-6">
        <button
          onClick={() => setIsJsonOpen(!isJsonOpen)}
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors w-full"
        >
          {isJsonOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {isJsonOpen ? 'Hide Raw Data' : 'View Raw Data'}
        </button>

        {isJsonOpen && (
          <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-hidden animate-in slide-in-from-top-2 duration-200">
            <pre className="text-[10px] text-zinc-400 font-mono overflow-x-auto whitespace-pre-wrap custom-scrollbar max-h-[300px]">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsCard({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 flex flex-col gap-2 hover:bg-zinc-900/50 transition-colors">
      <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="text-zinc-100 font-mono text-lg font-semibold truncate">
        {value}
      </div>
    </div>
  );
}
