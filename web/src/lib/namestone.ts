/**
 * Namestone API client for managing ENS subnames
 * Uses Next.js API route to avoid CORS issues
 */

import { NameData } from "@namestone/namestone-sdk";

// Re-export NameData for use in components
export type { NameData };

export interface SetNameRequest {
    domain: string;
    name: string;
    address: string;
    text_records?: Record<string, string>;
}

export interface SetNameResponse {
    success: boolean;
    message?: string;
    data?: unknown;
}

/**
 * Set a subname using Namestone API via Next.js API route
 * This avoids CORS issues by proxying the request through our server
 */
export async function setNameSubname(
    name: string,
    address: string,
    domain: string = 'iwitness.eth',
    textRecords?: Record<string, string>
): Promise<SetNameResponse> {
    try {
        const response = await fetch('/api/namestone/set-name', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                domain,
                name,
                address,
                text_records: textRecords,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || `API error: ${response.statusText}`);
        }

        return {
            success: true,
            data: data.data,
        };
    } catch (error) {
        console.error('Namestone API error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to set subname';
        throw new Error(errorMessage);
    }
}

export interface GetNamesParams {
    domain?: string;
    address?: string;
    text_records?: boolean;
    limit?: number;
    offset?: number;
}

export interface GetNamesResponse {
    success: boolean;
    data?: NameData[];
    error?: string;
}

/**
 * Get names (subnames) for a domain using Namestone API via Next.js API route
 */
export async function getNames(
    params: GetNamesParams = {}
): Promise<GetNamesResponse> {
    try {
        const queryParams = new URLSearchParams();

        if (params.domain) queryParams.append('domain', params.domain);
        if (params.address) queryParams.append('address', params.address);
        if (params.text_records !== undefined) {
            queryParams.append('text_records', params.text_records ? '1' : '0');
        }
        if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
        if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());

        const response = await fetch(`/api/namestone/get-names?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || `API error: ${response.statusText}`);
        }

        return {
            success: true,
            data: data.data,
        };
    } catch (error) {
        console.error('Namestone getNames error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to get names';
        return {
            success: false,
            error: errorMessage,
        };
    }
}

/**
 * Check if a subname is available by querying existing names
 */
export async function checkSubnameAvailability(
    name: string,
    domain: string = 'iwitness.eth'
): Promise<boolean> {
    // Simple validation - check if name is valid
    if (!name || name.length === 0) {
        return false;
    }

    // Basic validation - subnames should be alphanumeric with hyphens/underscores
    const validPattern = /^[a-z0-9-_]+$/i;
    if (!validPattern.test(name)) {
        return false;
    }

    // Check against existing names
    try {
        const response = await getNames({ domain });
        if (response.success && response.data) {
            // Check if the name already exists
            const exists = response.data.some(
                (nameData: NameData) => nameData.name === name
            );
            return !exists;
        }
    } catch (error) {
        console.error('Error checking availability:', error);
        // If we can't check, assume it's available if it passes validation
    }

    return true;
}

