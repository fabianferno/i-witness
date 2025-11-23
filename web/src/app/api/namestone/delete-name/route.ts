import { NextRequest, NextResponse } from 'next/server';
import NameStone, {
    AuthenticationError,
    NetworkError,
} from "@namestone/namestone-sdk";

const NAMESTONE_API_BASE = 'https://namestone.com/api/public_v1_sepolia';

export async function POST(request: NextRequest) {
    try {
        const apiKey = process.env.NEXT_PUBLIC_NAMESTONE_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'NEXT_PUBLIC_NAMESTONE_API_KEY is not set' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { domain, name } = body;

        // Validate required fields
        if (!domain || !name) {
            return NextResponse.json(
                { error: 'Missing required fields: domain or name' },
                { status: 400 }
            );
        }

        // Initialize SDK with API key
        const ns = new NameStone(apiKey, { baseUrl: NAMESTONE_API_BASE });

        try {
            const response = await ns.deleteName({
                domain,
                name,
            });

            return NextResponse.json({
                success: true,
                data: response,
            });
        } catch (error) {
            if (error instanceof AuthenticationError) {
                console.error("Authentication failed:", error.message);
                return NextResponse.json(
                    { error: 'Authentication failed', message: error.message },
                    { status: 401 }
                );
            } else if (error instanceof NetworkError) {
                console.error("Network error:", error.message);
                return NextResponse.json(
                    { error: 'Network error', message: error.message },
                    { status: 503 }
                );
            } else {
                console.error("Unexpected error:", error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return NextResponse.json(
                    { error: 'Failed to delete name', message: errorMessage },
                    { status: 500 }
                );
            }
        }
    } catch (error) {
        console.error('API route error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json(
            { error: 'Internal server error', message: errorMessage },
            { status: 500 }
        );
    }
}

