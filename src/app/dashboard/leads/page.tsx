import { LeadsInbox } from '@/components/dashboard/LeadsInbox';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
    return (
        <div className="h-full">
            <Suspense fallback={<div className="h-full flex items-center justify-center bg-zinc-950"><div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" /></div>}>
                <LeadsInbox />
            </Suspense>
        </div>
    );
}
