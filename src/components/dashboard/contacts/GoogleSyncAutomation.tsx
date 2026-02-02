'use client';

import { useEffect, useRef } from 'react';
import { syncGoogleContacts } from '@/app/actions/contacts';

export function GoogleSyncAutomation() {
    const lastSync = useRef<number>(0);

    useEffect(() => {
        // Sync on mount and then every 2 minutes if the page is active
        const runSync = async () => {
            const now = Date.now();
            
            // Check global (cross-tab) last sync time from localStorage
            const globalLastSync = localStorage.getItem('google_sync_global_last');
            if (globalLastSync && (now - parseInt(globalLastSync)) < 60000) {
                return;
            }

            // Small random delay to prevent multiple tabs from starting at exactly the same microsecond
            await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
            
            // Double check after delay
            const globalLastSyncDouble = localStorage.getItem('google_sync_global_last');
            if (globalLastSyncDouble && (now - parseInt(globalLastSyncDouble)) < 60000) {
                return;
            }

            localStorage.setItem('google_sync_global_last', Date.now().toString());
            
            try {
                console.log('[Sync Automation] Starting background Google sync (coordinated)...');
                await syncGoogleContacts();
                console.log('[Sync Automation] Background sync complete.');
            } catch (err) {
                console.error('[Sync Automation] Background sync failed:', err);
            }
        };

        runSync();

        const interval = setInterval(runSync, 120000); // 2 minutes
        return () => clearInterval(interval);
    }, []);

    return null; // Invisible helper
}
