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
        completedTasks: 0, // Will be updated by task widget if needed, or just keep count of some items
    };

    return <DashboardStats stats={stats} />;
}

async function TasksSection() {
    const res = await getTasks();
    const tasks = (res.success ? res.data : []) as any[];
    return <TodoListWidget tasks={tasks} mode="today" />;
}

async function CalendarSection() {
    // Note: getCalendarEvents needs projects/contacts/tasks for merging, 
    // but it can fetch them internally if not provided.
    const res = await getCalendarEvents();
    const events = (res.success ? res.events : []) as any[];
    const scopeError = res.success ? (res as any).scopeError : false;
    return <CalendarWidget events={events} scopeError={scopeError} />;
}

async function AnalyticsAndChartsSection() {
    const [cRes, pRes, dRes] = await Promise.all([
        getContacts(),
        getProjects(),
        getDeals()
    ]);
    const contacts = (cRes.success ? cRes.data : []) as any[];
    const projects = (pRes.data || []) as any[];
    const deals = (dRes.data || []) as any[];

    return (
        <>
            <AnalyticsSection contacts={contacts} deals={deals} projects={projects} />
            <ChartsRow deals={deals} projects={projects} />
        </>
    );
}

export default function DashboardPage() {
  return (
    <div className="h-auto md:h-[calc(100vh-40px)] flex flex-col max-w-full mx-auto overflow-y-auto md:overflow-hidden gap-1 md:gap-4 p-0">
      <PaymentSuccessToast />

      <div className="flex-shrink-0">
        <Suspense fallback={<div className="h-24 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-3xl" />}>
            <StatsSection />
        </Suspense>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 gap-0 md:gap-6 pb-8 md:max-w-5xl md:mx-auto w-full">
        <div className="lg:contents flex flex-col gap-0 overflow-hidden">
             <Suspense fallback={<div className="h-64 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-[2.5rem]" />}>
                <div className="lg:min-h-0"><TasksSection /></div>
             </Suspense>

             <Suspense fallback={<div className="h-64 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-[2.5rem]" />}>
                <CalendarSection />
             </Suspense>

             <Suspense fallback={<div className="h-64 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-[2.5rem]" />}>
                <AnalyticsAndChartsSection />
             </Suspense>
        </div>
      </div>
    </div>
  );
}
