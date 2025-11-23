import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

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
    const serializedPosts = posts.map((post) => ({
      ...post,
      _id: post._id.toString(),
      createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : post.createdAt,
    }));

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

