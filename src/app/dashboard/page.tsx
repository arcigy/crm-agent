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
    calendarRes
  ] = await Promise.all([
    getContacts(),
    getProjects(),
    getDeals(),
    getTasks(),
    getCalendarEvents()
  ]);

  const contacts = (contactsRes.success ? contactsRes.data : []) as any[];
  const projects = (projectsRes.data || []) as any[];
  const deals = (dealsRes.data || []) as any[];
  const tasks = (tasksRes.success ? tasksRes.data : []) as any[];
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
    <div className="flex flex-col max-w-[1600px] mx-auto gap-8 pb-8">
      <PaymentSuccessToast />

      {/* Primary Stats */}
      <div>
        <DashboardStats stats={stats} />
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-h-[400px]"><TodoListWidget tasks={tasks} mode="today" /></div>
        <div className="min-h-[400px] md:h-full"><ChartsRow deals={deals} projects={projects} /></div>
        <div className="min-h-[400px] md:h-full"><AnalyticsSection contacts={contacts} deals={deals} projects={projects} /></div>
        <div className="min-h-[400px]"><CalendarWidget events={calendarEvents} /></div>
      </div>

      <div className="hidden">
        {tools.map((tool) => (
          <ToolCard key={tool.id} toolId={tool.id} hasAccess={activeTools.has(tool.id)} />
        ))}
      </div>
    </div>
  );
}
