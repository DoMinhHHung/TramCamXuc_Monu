import { apiClient } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdDelivery {
    adId: string;
    advertiserName: string;
    title: string;
    description?: string;
    audioUrl: string;
    targetUrl: string;
    durationSeconds: number;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const getNextAd = async (): Promise<AdDelivery | null> => {
    try {
        const response = await apiClient.get<AdDelivery>('/ads/next');
        if (!response.data || !(response.data as any)?.adId) return null;
        return response.data;
    } catch (error: any) {
        if (error?.response?.status === 204) return null;
        console.warn('[Ads] getNextAd failed silently:', error?.message);
        return null;
    }
};

export const recordAdPlayed = async (
    adId: string,
    payload: { songId?: string; completed: boolean },
): Promise<void> => {
    try {
        await apiClient.post(`/ads/${adId}/played`, payload);
    } catch (error: any) {
        console.warn('[Ads] recordAdPlayed failed silently:', error?.message);
    }
};

export const recordAdClicked = async (adId: string): Promise<void> => {
    try {
        await apiClient.post(`/ads/${adId}/clicked`);
    } catch (error: any) {
        console.warn('[Ads] recordAdClicked failed silently:', error?.message);
    }
};