import { tools } from '@/tools/registry';
import { ToolCard } from '@/components/dashboard/ToolCard';
import { PaymentSuccessToast } from '@/components/dashboard/PaymentSuccessToast';
import { GoogleSetupBanner, GoogleConnectButton } from '@/components/dashboard/GoogleConnectButton';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  // Check if specifically redirected from Google Auth
  // Note: searchParams needs to be awaited in newer Next.js versions, but in 15/16.1 legacy sync access might depend on config. 
  // Let's assume standard access or await if needed.
  // In Next.js 15+, searchParams is a Promise. Let's handle it safely.

  // TODO: Implement Directus-based access control
  const activeTools = new Set(tools.map(t => t.id));

  // Logic to hide banner if connected would go here (server-side check of tokens if we had user session)
  // For now, we show it at the top as a prominent onboarding step

  return (
    <div>
      <PaymentSuccessToast />

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Vitajte späť vo vašom CRM.</p>
        </div>
        <div>
          <GoogleConnectButton />
        </div>
      </div>

      {/* Prominent Onboarding Banner */}
      <GoogleSetupBanner />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            toolId={tool.id}
            hasAccess={activeTools.has(tool.id)}
          />
        ))}
      </div>
    </div>
  );
}
