"use client";

import { tools } from "@/tools/registry"; // Removed Tool import as it is now inferred
import { createCheckoutSession } from "@/app/actions/stripe";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export function ToolCard({
  toolId,
  hasAccess,
}: {
  toolId: string;
  hasAccess: boolean;
}) {
  const tool = tools.find((t) => t.id === toolId);

  if (!tool) {
    return null;
  }

  const Icon = tool.icon;
  const [isLoading, setIsLoading] = useState(false);

  const handleBuy = async () => {
    if (!tool.stripePriceId) {
      toast.error("This tool is not available for purchase yet.");
      return;
    }

    try {
      setIsLoading(true);
      await createCheckoutSession(tool.stripePriceId, tool.id);
    } catch (error) {
      // The redirect will look like an error here sometimes in dev, but usually NEXT_REDIRECT is handled
      console.error(error);
      toast.error("Failed to start checkout process");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-border bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors">
          <Icon className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{tool.name}</h2>
      </div>
      <p className="text-muted-foreground mb-6 h-12 overflow-hidden">
        {tool.description}
      </p>

      {hasAccess ? (
        <Link
          href={tool.path}
          className="block w-full text-center bg-foreground text-background py-2.5 px-4 rounded-lg hover:opacity-90 transition-all font-medium"
        >
          Open Tool
        </Link>
      ) : (
        <button
          onClick={handleBuy}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
        >
          {isLoading ? "Processing..." : "Buy Access"}
        </button>
      )}
    </div>
  );
}
