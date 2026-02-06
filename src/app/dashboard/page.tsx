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

  // Statistics calculation logic preserved
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const stats = {
    contactsCount: contacts.length,
    contactsTrend: `+${contacts.filter(c => new Date(c.date_created) >= startOfMonth).length} tento mesiac`,
    activeProjects: projects.filter(p => p.stage !== 'completed' && p.stage !== 'archived').length,
    projectsTrend: `${projects.filter(p => new Date(p.date_created) >= startOfMonth).length} nových`,
    totalDealsValue: deals.reduce((acc, d) => acc + (d.value || 0), 0),
    dealsTrend: "Dnes bez aktivity",
    completedTasks: tasks.filter(t => (t as any).completed).length,
  };

  const activeTools = new Set(tools.map((t) => t.id));

  return (
    <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-64px)] flex flex-col max-w-[1600px] mx-auto overflow-hidden">
      <PaymentSuccessToast />

      {/* Primary Stats */}
      <div className="flex-shrink-0">
        <DashboardStats stats={stats} />
      </div>

      {/* Main Operations Grid - Slightly taller bottom row for Calendar & Analytics */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 grid-rows-2 gap-6 pb-6">
        <div className="min-h-0"><TodoListWidget tasks={tasks as any[]} mode="today" /></div>
        <div className="min-h-0"><ChartsRow deals={deals} projects={projects} /></div>
        <div className="min-h-0"><AnalyticsSection contacts={contacts as any[]} deals={deals as any[]} /></div>
        <div className="min-h-0"><CalendarWidget events={calendarEvents as any[]} /></div>
      </div>

      <div className="hidden">
        {tools.map((tool) => (
          <ToolCard key={tool.id} toolId={tool.id} hasAccess={activeTools.has(tool.id)} />
        ))}
      </div>
    </div>
  );
}
