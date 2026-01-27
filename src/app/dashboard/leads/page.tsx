import { LeadsInbox } from '@/components/dashboard/LeadsInbox';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
    return (
        <div className="h-full">
            <LeadsInbox />
        </div>
    );
}
