import { ReactNode } from 'react';

interface ToolGuardProps {
  toolId: string;
  children: ReactNode;
}

export async function ToolGuard({ toolId, children }: ToolGuardProps) {
  // For now, all tools are accessible without auth
  // TODO: Implement Directus-based access control
  return <>{children}</>;
}
