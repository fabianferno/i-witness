import { NextRequest, NextResponse } from 'next/server';
import { downloadFromStorage } from '@/lib/synapse';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  try {
    const { cid } = await params;

    if (!cid) {
      return NextResponse.json(
        { error: 'CID is required' },
        { status: 400 }
      );
    }

    console.log(`[Download] Downloading CID: ${cid}`);

    // Download directly from Filecoin storage using Synapse SDK
    const data = await downloadFromStorage(cid);

    // Convert Uint8Array to Buffer and parse as JSON
    const buffer = Buffer.from(data);
    
    // Parse as JSON (since we're storing JSON metadata)
    try {
      const jsonContent = JSON.parse(buffer.toString('utf-8'));
      return NextResponse.json({
        success: true,
        data: jsonContent,
      });
    } catch (parseError) {
      // If it's not JSON, return as text
      return NextResponse.json({
        success: true,
        data: buffer.toString('utf-8'),
        raw: true,
      });
    }
  } catch (error) {
    console.error('Error downloading CID content:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to download CID content', message: errorMessage },
      { status: 500 }
    );
  }
}

