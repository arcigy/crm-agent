import { tools } from '@/tools/registry';
import { ToolCard } from '@/components/dashboard/ToolCard';
import { PaymentSuccessToast } from '@/components/dashboard/PaymentSuccessToast';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // For now, all tools are accessible (no auth required)
  // TODO: Implement Directus-based access control
  const activeTools = new Set(tools.map(t => t.id));

  return (
    <div>
      <PaymentSuccessToast />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back, here are your active tools.</p>
      </div>

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
