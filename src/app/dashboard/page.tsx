import { Suspense } from "react";
import { PaymentSuccessToast } from "@/components/dashboard/PaymentSuccessToast";
import DashboardLoading from "@/app/dashboard/loading";

// Widgets (Components that will now fetch their own data or use server actions)
import { DashboardStats } from "@/components/dashboard/overview/StatCards";
import { ChartsRow } from "@/components/dashboard/overview/ChartsRow";
import { TodoListWidget } from "@/components/dashboard/overview/TodoListWidget";
import { CalendarWidget } from "@/components/dashboard/overview/CalendarWidget";
import { AnalyticsSection } from "@/components/dashboard/overview/AnalyticsSection";

// Actions
import { getContacts } from "@/app/actions/contacts";
import { getProjects } from "@/app/actions/projects";
import { getDeals } from "@/app/actions/deals";
import { getTasks } from "@/app/actions/tasks";
import { getCalendarEvents } from "@/app/actions/calendar";

export const dynamic = "force-dynamic";

async function StatsSection() {
    const [cRes, pRes, dRes] = await Promise.all([
        getContacts(),
        getProjects(),
        getDeals()
    ]);
    const contacts = (cRes.success ? cRes.data : []) as any[];
    const projects = (pRes.data || []) as any[];
    const deals = (dRes.data || []) as any[];
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
        contactsCount: contacts.length,
        contactsTrend: `+${contacts.filter(c => new Date(c.date_created) >= startOfMonth).length} tento mesiac`,
        activeProjects: projects.filter(p => p.stage !== 'completed' && p.stage !== 'archived').length,
        projectsTrend: `${projects.filter(p => new Date(p.date_created) >= startOfMonth).length} nových`,
        totalDealsValue: deals.reduce((acc, d) => acc + (d.value || 0), 0),
        dealsTrend: "Dnes bez aktivity",
        completedTasks: 0, 
    };

    return <DashboardStats stats={stats} />;
}

async function TasksSection() {
    const res = await getTasks();
    const tasks = (res.success ? res.data : []) as any[];
    return <TodoListWidget tasks={tasks} mode="today" />;
}

async function CalendarSection() {
    const res = await getCalendarEvents();
    const events = (res.success ? res.events : []) as any[];
    const scopeError = res.success ? (res as any).scopeError : false;
    return <CalendarWidget events={events} scopeError={scopeError} />;
}

async function AnalyticsSectionWrapper() {
    const res = await getContacts();
    const pRes = await getProjects();
    const contacts = (res.success ? res.data : []) as any[];
    const projects = (pRes.data || []) as any[];
    return <AnalyticsSection contacts={contacts} projects={projects} deals={[]} />;
}

async function ChartsSectionWrapper() {
    const pRes = await getProjects();
    const dRes = await getDeals();
    const projects = (pRes.data || []) as any[];
    const deals = (dRes.data || []) as any[];
    return <ChartsRow deals={deals} projects={projects} />;
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col max-w-full mx-auto gap-2 p-0">
      <PaymentSuccessToast />

      {/* Top Stats Row */}
      <div className="shrink-0">
        <Suspense fallback={<div className="h-24 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-3xl" />}>
            <StatsSection />
        </Suspense>
      </div>

      {/* 
          Main Grid Section 
          - forcing equal heights for all 4 main widgets
          - using h-[260px] as a mid-ground balance
          - grid automatically flows to 2 columns on large screens
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-3 w-full px-0">
        
        <div className="flex flex-col h-auto md:h-[340px]">
          <Suspense fallback={<div className="h-full bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-[2.5rem]" />}>
            <TasksSection />
          </Suspense>
        </div>

        <div className="flex flex-col h-auto md:h-[340px]">
          <Suspense fallback={<div className="h-full bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-[2.5rem]" />}>
            <CalendarSection />
          </Suspense>
        </div>

        <div className="flex flex-col h-auto md:h-[340px]">
          <Suspense fallback={<div className="h-full bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-[2.5rem]" />}>
            <AnalyticsSectionWrapper />
          </Suspense>
        </div>

        <div className="flex flex-col h-auto md:h-[340px]">
          <Suspense fallback={<div className="h-full bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-[2.5rem]" />}>
            <ChartsSectionWrapper />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
