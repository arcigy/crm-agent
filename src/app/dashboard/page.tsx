import { createClient } from '@/lib/supabase-server';
import { tools } from '@/tools/registry';
import { redirect } from 'next/navigation';
import { ToolCard } from '@/components/dashboard/ToolCard';
import { PaymentSuccessToast } from '@/components/dashboard/PaymentSuccessToast';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user access
  const { data: accessData } = await supabase
    .from('user_tool_access')
    .select('tool_id, status')
    .eq('user_id', user.id);

  const activeTools = new Set(
    accessData
      ?.filter((access) => access.status === 'active' || access.status === 'trialing')
      .map((access) => access.tool_id)
  );

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
