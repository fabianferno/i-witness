"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Clock, FileText } from "lucide-react";

interface Post {
  _id: string;
  hash: string;
  createdAt: string;
  size?: number;
  originalName?: string;
  mimeType?: string;
  signature?: string;
  [key: string]: any;
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

  if (loading) {
    return (
      <div className="w-full max-w-5xl space-y-6 my-24">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-zinc-900">Recent Uploads</h2>
          <div className="text-sm text-zinc-500">Loading...</div>
        </div>
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
      <div className="w-full max-w-5xl space-y-6 my-24">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-zinc-900">Recent Uploads</h2>
        </div>
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
      <div className="w-full max-w-5xl space-y-6 my-24">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-zinc-900">Recent Uploads</h2>
          <div className="text-sm text-zinc-500">No uploads yet</div>
        </div>
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
    <div className="w-full max-w-5xl space-y-6 my-24">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-zinc-900">Recent Uploads</h2>
        <div className="text-sm text-zinc-500">{posts.length} {posts.length === 1 ? 'upload' : 'uploads'}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <Card key={post._id} className="bg-black/10 border-zinc-800 hover:bg-black/20 transition-all overflow-hidden group">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-400" />
                  <Badge className="bg-zinc-900/50 text-zinc-200 border-zinc-700">
                    {post.mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}
                  </Badge>
                </div>
                {post.signature && (
                  <Badge className="bg-green-500/20 text-green-200 border-green-500/30">
                    Signed
                  </Badge>
                )}
              </div>

              <div className="space-y-2 mb-3">
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Hash (CID)</p>
                  <p className="text-sm font-mono text-zinc-200 break-all">
                    {post.hash}
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

