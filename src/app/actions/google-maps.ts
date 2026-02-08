"use server";

import { decrypt } from "@/lib/encryption";

interface VerifyResult {
    isValid: boolean;
    error?: string;
}

export async function verifyApiKey(apiKey: string): Promise<VerifyResult> {
    try {
        const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Google&inputtype=textquery&fields=name&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
            return { isValid: true };
        }
        if (data.error_message) {
            return { isValid: false, error: data.error_message };
        }
        return { isValid: false, error: `Google Status: ${data.status}` };
    } catch (error: any) {
        return { isValid: false, error: error.message || "Network Error" };
    }
}

interface PlaceResult {
    name: string;
    place_id: string;
    formatted_address?: string;
    rating?: number;
    user_ratings_total?: number;
    types?: string[];
    geometry?: {
        location: {
            lat: number;
            lng: number;
        }
    };
}

interface PlaceDetails {
    name: string;
    formatted_address?: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    rating?: number;
    user_ratings_total?: number;
    place_id: string;
    reviews?: any[];
    url?: string; // Google Maps URL
}

export async function searchBusinesses(apiKey: string, query: string, pageToken?: string) {
    try {
        let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
        if (pageToken) {
            url += `&pagetoken=${pageToken}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            throw new Error(data.error_message || `API Error: ${data.status}`);
        }

        return {
            results: data.results as PlaceResult[],
            next_page_token: data.next_page_token as string | undefined,
            status: data.status
        };
    } catch (error: any) {
        console.error("Search Error:", error);
        throw new Error(error.message || "Search failed");
    }
}

export async function getPlaceDetails(apiKey: string, placeId: string) {
    try {
        // Žiadame polia: name, address, phone, website, rating, reviews
        const fields = "name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,url,international_phone_number";
        const url = `https://maps.googleapis.com/maps/api/place/details/json?placeid=${placeId}&fields=${fields}&key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK') {
            // Ignorujeme chyby detailov, vrátime null
            console.warn(`Details failed for ${placeId}: ${data.status}`);
            return null;
        }

        return data.result as PlaceDetails;
    } catch (error) {
        return null;
    }
}
