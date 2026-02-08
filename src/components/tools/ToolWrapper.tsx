import React from 'react';

interface ToolWrapperProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  toolId?: string;
}

export function ToolWrapper({ title, icon, children }: ToolWrapperProps) {
  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-white rounded-3xl shadow-sm border border-gray-100">
            {icon}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
            <p className="text-gray-500 font-medium">BETA | Professional Tool Environment</p>
          </div>
        </div>
        
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </div>
    </div>
  );
}
