import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { CID } from 'multiformats/cid';

// Helper function to convert CID object to string
function convertCidToString(cid: any): string {
  if (typeof cid === 'string') {
    return cid;
  }
  if (!cid || typeof cid !== 'object') {
    return String(cid || 'Unknown');
  }
  
  // Check if it's a CID object with toString method
  if (typeof cid.toString === 'function' && cid.toString !== Object.prototype.toString) {
    try {
      return cid.toString();
    } catch (e) {
      // Fall through to other methods
    }
  }
  
  // Check if it's IPLD format: { "/": "..." }
  if ('/' in cid && typeof cid['/'] === 'string') {
    return cid['/'];
  }
  
  // Try to convert using multiformats CID if it has CID structure
  if ('code' in cid && 'version' in cid) {
    try {
      // If it has bytes property (Uint8Array-like), decode it
      if (cid.bytes && Array.isArray(cid.bytes)) {
        const cidInstance = CID.decode(new Uint8Array(cid.bytes));
        return cidInstance.toString();
      }
      
      // If it's a Uint8Array-like object with numeric keys, convert it
      if (cid.length !== undefined || Object.keys(cid).some(k => !isNaN(Number(k)))) {
        const bytes: number[] = [];
        const numericKeys = Object.keys(cid)
          .map(k => Number(k))
          .filter(k => !isNaN(k) && k >= 0);
        const maxKey = numericKeys.length > 0 ? Math.max(...numericKeys) : -1;
        
        for (let i = 0; i <= maxKey; i++) {
          if (cid[i] !== undefined && typeof cid[i] === 'number') {
            bytes.push(cid[i]);
          }
        }
        if (bytes.length > 0) {
          const cidInstance = CID.decode(new Uint8Array(bytes));
          return cidInstance.toString();
        }
      }
    } catch (e) {
      console.warn('Failed to convert CID object using multiformats:', e);
    }
  }
  
  // Last resort: return a truncated representation
  return `CID(${Object.keys(cid).slice(0, 3).join(', ')}...)`;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0;

    const db = await getDatabase();
    const collection = db.collection('posts');

    const posts = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();


    // Convert MongoDB ObjectId and Date to JSON-serializable format
    // Also convert CID objects to strings
    const serializedPosts = posts.map((post) => {
      const serialized: any = {
        ...post,
        _id: post._id.toString(),
        createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : post.createdAt,
      };
      
      // Convert hash (CID) to string if it's an object
      if (post.hash && typeof post.hash === 'object') {
        serialized.hash = convertCidToString(post.hash);
      } else if (!post.hash) {
        // If hash is missing, try to get it from other fields
        serialized.hash = post.hash || 'Unknown';
      }
      
      return serialized;
    });

    return NextResponse.json({
      success: true,
      data: serializedPosts,
      count: serializedPosts.length,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch posts', message: errorMessage },
      { status: 500 }
    );
  }
}

