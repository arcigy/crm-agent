"use client";

import * as React from "react";
import { getAvailableTools, runToolManually } from "@/app/actions/agent";
import { toast } from "sonner";
import {
  Loader2,
  Play,
  CheckCircle,
  XCircle,
  Search,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ToolsDebugger() {
  const [tools, setTools] = React.useState<any[]>([]);
  const [selectedTool, setSelectedTool] = React.useState<string | null>(null);
  const [argsJson, setArgsJson] = React.useState<string>("{}");
  const [result, setResult] = React.useState<any | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isRunning, setIsRunning] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    setIsLoading(true);
    getAvailableTools()
      .then((data) => {
        setTools(data);
        if (data.length > 0) selectTool(data[0]);
      })
      .catch((err) => toast.error("Failed to load tools: " + err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const selectTool = (tool: any) => {
    setSelectedTool(tool.function.name);
    setResult(null);

    // Generate example JSON from parameters
    const params = tool.function.parameters?.properties || {};
    const example: any = {};
    for (const [key, val] of Object.entries(params) as [string, any][]) {
      if (val.type === "string") example[key] = "text";
      if (val.type === "number") example[key] = 123;
      if (val.type === "boolean") example[key] = true;
      if (val.enum) example[key] = val.enum[0];
    }
    setArgsJson(JSON.stringify(example, null, 2));
  };

  const handleRun = async () => {
    if (!selectedTool) return;
    setIsRunning(true);
    setResult(null);

    try {
      let args = {};
      try {
        args = JSON.parse(argsJson);
      } catch (e) {
        toast.error("Invalid JSON format");
        setIsRunning(false);
        return;
      }

      const res = await runToolManually(selectedTool, args);
      setResult(res);
      if (res.success) toast.success("Tool executed successfully");
      else toast.error("Tool execution failed");
    } catch (e: any) {
      toast.error("Error executing tool: " + e.message);
      setResult({ success: false, error: e.message });
    } finally {
      setIsRunning(false);
    }
  };

  const filteredTools = tools.filter((t) =>
    t.function.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getToolDef = () => tools.find((t) => t.function.name === selectedTool);

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 p-6">
      {/* LEFT PANEL: Tool List */}
      <div className="w-1/3 min-w-[300px] flex flex-col gap-4 bg-white/5 border border-white/10 rounded-3xl p-4 overflow-hidden">
        <div className="flex items-center gap-2 px-2">
          <Terminal className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Atomic Tools
          </h2>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          ) : (
            filteredTools.map((tool) => (
              <button
                key={tool.function.name}
                onClick={() => selectTool(tool)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 group",
                  selectedTool === tool.function.name
                    ? "bg-indigo-500/20 border-indigo-500/50 shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]"
                    : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10",
                )}
              >
                <div className="font-mono text-sm font-semibold text-indigo-300 group-hover:text-indigo-200">
                  {tool.function.name}
                </div>
                <div className="text-xs text-white/50 line-clamp-1 mt-1">
                  {tool.function.description}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* MIDDLE PANEL: Input & Config */}
      <div className="flex-1 flex flex-col gap-4">
        {selectedTool && (
          <>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedTool}
                  </h3>
                  <div className="text-sm text-white/60 mt-1">
                    {getToolDef()?.function.description}
                  </div>
                </div>
                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  Run Tool
                </button>
              </div>

              <div className="flex-1 flex flex-col gap-2">
                <label className="text-xs font-mono text-white/40 uppercase tracking-wider">
                  Input JSON Arguments
                </label>
                <textarea
                  value={argsJson}
                  onChange={(e) => setArgsJson(e.target.value)}
                  className="flex-1 w-full bg-[#0F1117] border border-white/10 rounded-xl p-4 font-mono text-sm text-emerald-300 focus:outline-none focus:border-emerald-500/50 resize-none selection:bg-emerald-500/30"
                  spellCheck="false"
                />
              </div>
            </div>

            {/* RIGHT PANEL: Output (Combined for vertical layout if better, but let's put it below for now) */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex-1 flex flex-col overflow-hidden min-h-[300px]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono text-white/40 uppercase tracking-wider">
                  Result
                </label>
                {result && (
                  <div
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full",
                      result.success
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400",
                    )}
                  >
                    {result.success ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {result.success ? "SUCCESS" : "ERROR"}
                  </div>
                )}
              </div>

              <div className="flex-1 relative bg-[#0F1117] border border-white/10 rounded-xl overflow-hidden">
                {isRunning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  </div>
                )}
                <pre className="p-4 font-mono text-xs text-white/80 overflow-auto h-full w-full">
                  {result
                    ? JSON.stringify(result, null, 2)
                    : "// Run tool to see output..."}
                </pre>
              </div>
            </div>
          </>
        )}

        {!selectedTool && (
          <div className="flex-1 flex items-center justify-center text-white/30 italic">
            Select a tool to start debugging
          </div>
        )}
      </div>
    </div>
  );
}
