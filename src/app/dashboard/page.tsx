import { tools } from "@/tools/registry";
import { PaymentSuccessToast } from "@/components/dashboard/PaymentSuccessToast";
import { GoogleConnectButton } from "@/components/dashboard/GoogleConnectButton";
import { DashboardStats } from "@/components/dashboard/overview/StatCards";
import { ChartsRow } from "@/components/dashboard/overview/ChartsRow";
import { TodoListWidget } from "@/components/dashboard/overview/TodoListWidget";
import { CalendarWidget } from "@/components/dashboard/overview/CalendarWidget";
import { AnalyticsSection } from "@/components/dashboard/overview/AnalyticsSection";
import { ToolCard } from "@/components/dashboard/ToolCard";

// Actions
import { getContacts } from "@/app/actions/contacts";
import { getProjects } from "@/app/actions/projects";
import { getDeals } from "@/app/actions/deals";
import { getTasks } from "@/app/actions/tasks";
import { getCalendarEvents } from "@/app/actions/calendar";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Fetch everything for the overview
  const [
    contactsRes,
    projectsRes,
    dealsRes,
    tasksRes,
    calendarRes
  ] = await Promise.all([
    getContacts(),
    getProjects(),
    getDeals(),
    getTasks(),
    getCalendarEvents()
  ]);

  const contacts = contactsRes.success ? contactsRes.data : [];
  const projects = projectsRes.data || [];
  const deals = dealsRes.data || [];
  const tasks = tasksRes.success ? tasksRes.data : [];
  const calendarEvents = calendarRes.success ? calendarRes.events : [];

  const stats = {
    contactsCount: (contacts as any[]).length,
    activeProjects: projects.filter(p => p.stage !== 'completed' && p.stage !== 'archived').length,
    totalDealsValue: deals.reduce((acc, d) => acc + (d.value || 0), 0),
    completedTasks: tasks.filter(t => t.completed).length,
  };

  const activeTools = new Set(tools.map((t) => t.id));

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-12">
      <PaymentSuccessToast />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b-4 border-black border-dotted">
        <div>
          <h1 className="text-5xl font-black text-foreground uppercase italic tracking-tighter leading-none">
            Centrálna Riadiaca Jednotka
          </h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs mt-4">
            Prehľad tvojho biznisu v reálnom čase
          </p>
        </div>
        <div className="flex gap-4">
          <GoogleConnectButton />
        </div>
      </div>

      {/* Primary Stats */}
      <DashboardStats stats={stats} />

      {/* Performance & Pipeline */}
      <ChartsRow deals={deals} projects={projects} />

      {/* Daily Operations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TodoListWidget tasks={tasks as any[]} />
        <CalendarWidget events={calendarEvents as any[]} />
      </div>

      {/* Detailed Analytics */}
      <AnalyticsSection contacts={contacts as any[]} deals={deals as any[]} />

      {/* Tools Section */}
      <div className="pt-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-1 flex-1 bg-black/10" />
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">Nástroje Agenta</h2>
          <div className="h-1 flex-1 bg-black/10" />
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
    </div>
  );
}
