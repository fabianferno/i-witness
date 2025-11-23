import { NextRequest, NextResponse } from 'next/server';
import NameStone, {
    AuthenticationError,
    NetworkError,
} from "@namestone/namestone-sdk";

const NAMESTONE_API_BASE = 'https://namestone.com/api/public_v1_sepolia';

export async function GET(request: NextRequest) {
    try {
        const apiKey = process.env.NEXT_PUBLIC_NAMESTONE_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'NEXT_PUBLIC_NAMESTONE_API_KEY is not set' },
                { status: 500 }
            );
        }

        // Get query parameters
        const searchParams = request.nextUrl.searchParams;
        const domain = searchParams.get('domain');
        const address = searchParams.get('address');
        const textRecords = searchParams.get('text_records') !== '0'; // Default to 1 (true)
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
        const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

        // Initialize SDK with API key
        const ns = new NameStone(apiKey, { baseUrl: NAMESTONE_API_BASE });

        try {
            // Build parameters object
            const params: {
                domain?: string;
                address?: string;
                text_records?: boolean;
                limit?: number;
                offset?: number;
            } = {};

            if (domain) params.domain = domain;
            if (address) params.address = address;
            params.text_records = textRecords;
            params.limit = limit;
            params.offset = offset;

            const response = await ns.getNames(params);

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
                    { error: 'Failed to get names', message: errorMessage },
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

