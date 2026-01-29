import { ToolsDebugger } from "@/components/dashboard/ToolsDebugger";

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-[1600px] mx-auto">
        <header className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Level 0 Debugger
            </h1>
            <p className="text-sm text-white/50">
              Manual Tool Orchestration & Verification
            </p>
          </div>
        </header>

        <ToolsDebugger />
      </div>
    </div>
  );
}
