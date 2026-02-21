"use client";

export default function DashboardLoading() {
  return (
    <div className="w-full h-full flex flex-col gap-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-3">
          <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
          <div className="h-4 w-48 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
        </div>
        <div className="h-12 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-48 bg-zinc-200 dark:bg-zinc-800 rounded-[2.5rem]" />
        <div className="h-48 bg-zinc-200 dark:bg-zinc-800 rounded-[2.5rem]" />
        <div className="h-48 bg-zinc-200 dark:bg-zinc-800 rounded-[2.5rem]" />
      </div>

      {/* Large Content Skeleton */}
      <div className="h-96 bg-zinc-200 dark:bg-zinc-800 rounded-[2.5rem] w-full" />
    </div>
  );
}
