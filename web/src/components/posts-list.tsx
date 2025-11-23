"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Database, Clock, FileText, Download, Loader2, Image as ImageIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

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
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [contentData, setContentData] = useState<unknown>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

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

  const fetchContent = async (cid: string) => {
    setContentLoading(true);
    setContentError(null);
    setContentData(null);

    try {
      const response = await fetch(`/api/download/${cid}`);
      const data = await response.json();

      if (data.success) {
        setContentData(data.data);
      } else {
        setContentError(data.error || 'Failed to fetch content');
      }
    } catch (err) {
      setContentError(err instanceof Error ? err.message : 'Failed to fetch content');
    } finally {
      setContentLoading(false);
    }
  };

  const handleOpenDialog = (post: Post) => {
    setSelectedPost(post);
    if (post.hash) {
      fetchContent(post.hash);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-5xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-black/10 border-zinc-800 animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-zinc-800/50 rounded w-3/4 mb-2" />
                <div className="h-3 bg-zinc-800/30 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-5xl space-y-6">
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
      <div className="w-full max-w-5xl space-y-6">
        <Card className="bg-black/10 border-zinc-800">
          <CardContent className="p-8 text-center">
            <Database className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-500">No posts found. Uploads will appear here once files are uploaded to Filecoin.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl space-y-6 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <Card key={post._id} className="bg-black/10 !py-0 border-zinc-800 hover:bg-black/20 transition-all overflow-hidden group">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-900" />
                  <Badge className="bg-zinc-900/70 text-zinc-200 border-zinc-700">
                    {post.mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}
                  </Badge>
                </div>
                {post.signature && (
                  <Badge className="bg-green-900/50 text-green-200 border-green-500/30">
                    Signed
                  </Badge>
                )}
              </div>

              <div className="space-y-2 mb-3">
                <div>
                  <p className="text-xs text-zinc-700 mb-1">Hash (CID)</p>
                  <p className="text-sm font-mono text-zinc-900 break-all">
                    {typeof post.hash === 'string' ? post.hash : String(post.hash || 'Unknown')}
                  </p>
                </div>

                {post.originalName && (
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Original Name</p>
                    <p className="text-sm text-zinc-300 truncate">{post.originalName}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Clock className="w-3 h-3" />
                  {formatDate(post.createdAt)}
                </div>
                {post.size && (
                  <div className="text-xs text-zinc-500">
                    {formatFileSize(post.size)}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-800/50">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-black hover:bg-zinc-800 hover:text-white border-zinc-700 text-zinc-200"
                      onClick={() => handleOpenDialog(post)}
                    >
                      <Download className="w-3 h-3 mr-2" />
                      View Content
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-zinc-900 border-zinc-800">
                    <DialogHeader>
                      <DialogTitle className="text-zinc-100">CID Content</DialogTitle>
                      <DialogDescription className="text-zinc-400">
                        {selectedPost?.hash}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                      {contentLoading && (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                          <span className="ml-2 text-zinc-400">Loading content...</span>
                        </div>
                      )}
                      {contentError && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded p-4">
                          <p className="text-red-200">Error: {contentError}</p>
                        </div>
                      )}
                      {contentData !== null && !contentLoading && (
                        <ContentDisplay data={contentData as ContentData} />
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Component to display content with images and charts
function ContentDisplay({ data }: { data: ContentData }) {
  const depthData = data.data?.depthData;
  const baseImage = data.data?.baseImage;
  const depthImage = data.data?.depthImage;
  const timestamp = data.data?.timestamp;
  const signature = data.signature;

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
    { name: 'Invalid', value: (totalPixels - (depthData?.valid_pixels || 0)), color: '#6b7280' },
  ];

  const COLORS = ['#10b981', '#6b7280'];

  return (
    <div className="space-y-6">
      {/* Images Section */}
      {(baseImage || depthImage) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Images
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {baseImage && (
              <div className="bg-zinc-950 border border-zinc-800 rounded p-4">
                <p className="text-sm text-zinc-400 mb-2">Base Image</p>
                <img
                  src={`data:image/png;base64,${baseImage}`}
                  alt="Base image"
                  className="w-full h-auto rounded border border-zinc-700"
                />
              </div>
            )}
            {depthImage && (
              <div className="bg-zinc-950 border border-zinc-800 rounded p-4">
                <p className="text-sm text-zinc-400 mb-2">Depth Image</p>
                <img
                  src={`data:image/png;base64,${depthImage}`}
                  alt="Depth image"
                  className="w-full h-auto rounded border border-zinc-700"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Depth Data Statistics */}
      {depthData && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zinc-100">Depth Data Statistics</h3>

          {/* Basic Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
              <p className="text-xs text-zinc-400 mb-1">Shape</p>
              <p className="text-sm font-mono text-zinc-200">
                {depthData.shape.join(' × ')}
              </p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
              <p className="text-xs text-zinc-400 mb-1">Data Type</p>
              <p className="text-sm font-mono text-zinc-200">{depthData.dtype}</p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
              <p className="text-xs text-zinc-400 mb-1">Valid Pixels</p>
              <p className="text-sm font-mono text-zinc-200">
                {depthData.valid_pixels.toLocaleString()}
              </p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
              <p className="text-xs text-zinc-400 mb-1">Coverage</p>
              <p className="text-sm font-mono text-zinc-200">
                {validPixelsPercentage.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Depth Statistics Bar Chart */}
            {depthStatsData.length > 0 && (
              <div className="bg-zinc-950 border border-zinc-800 rounded p-4">
                <p className="text-sm text-zinc-400 mb-4">Depth Value Statistics</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={depthStatsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        color: '#f3f4f6',
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {depthStatsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Valid Pixels Pie Chart */}
            {pixelData.length > 0 && totalPixels > 0 && (
              <div className="bg-zinc-950 border border-zinc-800 rounded p-4">
                <p className="text-sm text-zinc-400 mb-4">Pixel Coverage</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pixelData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(1) : 0}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pixelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        color: '#f3f4f6',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-zinc-100">Metadata</h3>
        <div className="bg-zinc-950 border border-zinc-800 rounded p-4 space-y-2">
          {timestamp && (
            <div className="flex justify-between">
              <span className="text-sm text-zinc-400">Timestamp:</span>
              <span className="text-sm text-zinc-200 font-mono">
                {new Date(timestamp).toLocaleString()}
              </span>
            </div>
          )}
          {signature && (
            <div className="flex justify-between">
              <span className="text-sm text-zinc-400">Signature:</span>
              <span className="text-sm text-zinc-200 font-mono break-all">
                {signature.substring(0, 20)}...{signature.substring(signature.length - 20)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Raw JSON (collapsible) */}
      <details className="bg-zinc-950 border border-zinc-800 rounded p-4">
        <summary className="text-sm text-zinc-400 cursor-pointer hover:text-zinc-300">
          View Raw JSON
        </summary>
        <pre className="text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap wrap-break-word mt-4">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

