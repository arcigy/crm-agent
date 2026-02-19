import { tools } from "@/tools/registry";
import { PaymentSuccessToast } from "@/components/dashboard/PaymentSuccessToast";
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
  ] = await Promise.all([
    getContacts(),
    getProjects(),
    getDeals(),
    getTasks(),
  ]);

  const contacts = (contactsRes.success ? contactsRes.data : []) as any[];
  const projects = (projectsRes.data || []) as any[];
  const deals = (dealsRes.data || []) as any[];
  const tasks = (tasksRes.success ? tasksRes.data : []) as any[];

  // Fetch calendar events using the already fetched data to speed up page load
  const calendarRes = await getCalendarEvents(undefined, undefined, projects, contacts, tasks);
  const calendarEvents = (calendarRes.success ? calendarRes.events : []) as any[];

  // Statistics calculation logic preserved
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats = {
    contactsCount: contacts.length,
    contactsTrend: `+${contacts.filter(c => new Date(c.date_created) >= startOfMonth).length} tento mesiac`,
    activeProjects: projects.filter(p => p.stage !== 'completed' && p.stage !== 'archived').length,
    projectsTrend: `${projects.filter(p => new Date(p.date_created) >= startOfMonth).length} nových`,
    totalDealsValue: deals.reduce((acc, d) => acc + (d.value || 0), 0),
    dealsTrend: "Dnes bez aktivity",
    completedTasks: tasks.filter(t => t.completed).length,
  };

  const activeTools = new Set(tools.map((t) => t.id));

  return (
    <div className="h-auto md:h-[calc(100vh-40px)] flex flex-col max-w-full mx-auto overflow-y-auto md:overflow-hidden gap-1 md:gap-4 p-0">
      <PaymentSuccessToast />

      {/* Primary Stats */}
      <div className="flex-shrink-0">
        <DashboardStats stats={stats} />
      </div>

      {/* Main Operations Grid */}
      <div className="flex-shrink-0 grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 gap-0 md:gap-6 md:max-w-5xl md:mx-auto w-full">
        {/* Mobile: Tight stack for all items. Desktop: Grid-aware via contents. */}
        <div className="lg:contents flex flex-col gap-0 overflow-hidden">
          <div className="lg:min-h-0"><TodoListWidget tasks={tasks} mode="today" /></div>
          <CalendarWidget events={calendarEvents} />
          <AnalyticsSection contacts={contacts} deals={deals} projects={projects} />
          <ChartsRow deals={deals} projects={projects} />
        </div>
      </div>

      {/* Mobile-only Quick Tools Grid to fill empty space */}
      <div className="md:hidden px-6 pt-2 pb-8 flex flex-col gap-4">
        <h4 className="text-[10px] font-black uppercase italic tracking-[0.3em] text-zinc-500 opacity-40">Rýchle nástroje</h4>
        <div className="grid grid-cols-4 gap-4">
          {tools.filter(t => t.id !== 'dummy-tool').slice(0, 8).map((tool) => {
            const Icon = tool.icon;
            return (
              <a 
                key={tool.id} 
                href={tool.path}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-900/60 border border-indigo-500/10 dark:border-indigo-500/5 backdrop-blur-xl flex items-center justify-center transition-all group-active:scale-95 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-400 group-hover:shadow-[0_10px_30px_rgba(79,70,229,0.3)]">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[8px] font-black uppercase tracking-tighter text-zinc-400 truncate w-full text-center">{tool.name}</span>
              </a>
            );
          })}
        </div>
      </div>

      <div className="hidden">
        {tools.map((tool) => (
          <ToolCard key={tool.id} toolId={tool.id} hasAccess={activeTools.has(tool.id)} />
        ))}
      </div>
    </div>
  );
}
