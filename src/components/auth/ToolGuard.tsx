import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

interface ToolGuardProps {
  toolId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export async function ToolGuard({ toolId, children, fallback }: ToolGuardProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: access } = await supabase
    .from('user_tool_access')
    .select('status')
    .eq('user_id', user.id)
    .eq('tool_id', toolId)
    .single();

  const hasAccess = access?.status === 'active' || access?.status === 'trialing';

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    // Redirect to dashboard where they can buy access
    redirect('/dashboard');
  }

  return <>{children}</>;
}
