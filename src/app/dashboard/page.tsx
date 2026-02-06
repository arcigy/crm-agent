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

  const contacts = contactsRes.success ? (contactsRes.data as any[]) : [];
  const projects = projectsRes.data || [];
  const deals = dealsRes.data || [];
  const tasks = tasksRes.success ? tasksRes.data : [];
  const calendarEvents = calendarRes.success ? calendarRes.events : [];

  // Calculate Stats & Trends
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const contactsThisMonth = contacts.filter(c => new Date(c.date_created) >= startOfMonth).length;
  const contactsLastMonth = contacts.filter(c => {
    const d = new Date(c.date_created);
    return d >= startOfLastMonth && d < startOfMonth;
  }).length;
  
  const contactsTrend = contactsLastMonth > 0 
    ? `${Math.round(((contactsThisMonth - contactsLastMonth) / contactsLastMonth) * 100)}% tento mesiac`
    : `+${contactsThisMonth} tento mesiac`;

  const projectsNewThisMonth = projects.filter(p => new Date(p.date_created) >= startOfMonth).length;
  const dealsValueToday = deals
    .filter(d => new Date(d.date_created) >= today)
    .reduce((acc, d) => acc + (d.value || 0), 0);

  const stats = {
    contactsCount: contacts.length,
    contactsTrend,
    activeProjects: projects.filter(p => p.stage !== 'completed' && p.stage !== 'archived').length,
    projectsTrend: `${projectsNewThisMonth} nových`,
    totalDealsValue: deals.reduce((acc, d) => acc + (d.value || 0), 0),
    dealsTrend: dealsValueToday > 0 ? `+${(dealsValueToday / 1000).toFixed(1)}k € dnes` : "Dnes bez aktivity",
    completedTasks: tasks.filter(t => (t as any).completed).length,
  };

  const activeTools = new Set(tools.map((t) => t.id));

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-12">
      <PaymentSuccessToast />

      {/* Header Removed as per user request for cleaner layout */}
      <div className="hidden"></div>

      {/* Primary Stats */}
      <DashboardStats stats={stats} />

      {/* Performance & Pipeline */}
      <ChartsRow deals={deals} projects={projects} tasks={tasks as any[]} />

      {/* Daily Operations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TodoListWidget tasks={tasks as any[]} />
        <CalendarWidget events={calendarEvents as any[]} />
      </div>

      {/* Detailed Analytics */}
      <AnalyticsSection contacts={contacts as any[]} deals={deals as any[]} />

      {/* Tools Section visually removed as per user request */}
      <div className="hidden">
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            toolId={tool.id}
            hasAccess={activeTools.has(tool.id)}
          />
        ))}
      </div>
    </div>
  );
}
