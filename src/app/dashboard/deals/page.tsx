import { DealsTable } from "@/components/dashboard/DealsTable";
import { getDeals } from "@/app/actions/deals";
import { getProjects } from "@/app/actions/projects";
import { getContacts } from "@/app/actions/contacts";
import { Banknote, Plus, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const [dealsRes, projectsRes, contactsRes] = await Promise.all([
    getDeals(),
    getProjects(),
    getContacts(),
  ]);

  const deals = dealsRes.data || [];
  const projects = projectsRes.data || [];
  const contacts = (contactsRes.data as any[]) || [];

  return (
    <div className="space-y-8 h-[calc(100vh-100px)] flex flex-col p-8 transition-colors duration-500">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/20">
              <Banknote className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic leading-none">
              Finance / <span className="text-blue-500">Deals & Invoicing</span>
            </h1>
          </div>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] pl-1 opacity-60 flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-blue-500" />
            Treasury Management Infrastructure
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-6 py-3 bg-muted border border-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-foreground/70 hover:bg-card transition-all active:scale-95">
            <Plus className="w-4 h-4" /> Vytvoriť Obchod
          </button>
        </div>
      </div>

      {/* Quick Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
        {[
          { label: "Otvorené obchody", value: projects.length, color: "blue" },
          {
            label: "Celková hodnota",
            value: `${deals.reduce((acc, d) => acc + (d.value || 0), 0)} €`,
            color: "indigo",
          },
          {
            label: "Nezaplatené",
            value: `${deals.filter((d) => d.invoice_date && !d.paid).length} faktúr`,
            color: "amber",
          },
          {
            label: "Hotovosť",
            value: `${deals.filter((d) => d.paid).reduce((acc, d) => acc + (d.value || 0), 0)} €`,
            color: "emerald",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-card border border-border p-6 rounded-[2rem] shadow-sm flex flex-col gap-1 transition-all hover:shadow-xl hover:shadow-blue-500/5 group"
          >
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">
              {stat.label}
            </span>
            <span
              className={`text-2xl font-black text-${stat.color}-500 group-hover:scale-105 transition-transform origin-left uppercase italic italic tracking-tighter`}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-hidden">
        <DealsTable deals={deals} projects={projects} contacts={contacts} />
      </div>
    </div>
  );
}
