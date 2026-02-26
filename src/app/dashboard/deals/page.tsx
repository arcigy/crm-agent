import { Suspense } from "react";
import { DealsTable } from "@/components/dashboard/DealsTable";
import { getDeals } from "@/app/actions/deals";
import { getProjects } from "@/app/actions/projects";
import { getContacts } from "@/app/actions/contacts";
import DashboardLoading from "@/app/dashboard/loading";
import { Lead } from "@/types/contact";
import { Banknote, TrendingUp, Euro, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

async function DealsContent() {
  const [dealsRes, projectsRes, contactsRes] = await Promise.all([
    getDeals(),
    getProjects(),
    getContacts(),
  ]);

  const deals = dealsRes.data || [];
  const projects = projectsRes.data || [];
  const contacts = (contactsRes.data as Lead[]) || [];

  const totalRevenue = projects.reduce((acc, p) => {
    const d = deals.find((deal) => deal.project_id === p.id);
    return acc + (Number(p.value ?? d?.value) || 0);
  }, 0);

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 px-2">
      <div className="flex-1 min-h-0 relative">
        {/* Revenue Badge */}
        <div className="absolute -top-20 right-4 z-40">
            <div className="bg-emerald-500/5 border border-emerald-500/20 px-6 py-3 rounded-[2rem] backdrop-blur-2xl shadow-[0_20px_50px_rgba(16,185,129,0.1)] flex items-center gap-4 group hover:border-emerald-500/40 transition-all duration-500">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:rotate-12 transition-all">
                    <Zap className="w-6 h-6 text-white fill-white" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500/60 group-hover:text-emerald-400 transition-colors">Hodnota</span>
                    <span className="text-2xl font-black text-white italic tracking-tighter tabular-nums leading-none mt-0.5">
                        {new Intl.NumberFormat("sk-SK", {
                        style: "currency",
                        currency: "EUR",
                        }).format(totalRevenue)}
                    </span>
                </div>
            </div>
        </div>

        <DealsTable deals={deals} projects={projects} contacts={contacts} />
      </div>
    </div>
  );
}

export default function DealsPage() {
  return (
    <div className="h-full flex flex-col p-4 bg-transparent transition-colors duration-500 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white leading-none">
            Financie
          </h1>
        </div>
      </div>

      <Suspense fallback={<DashboardLoading />}>
        <DealsContent />
      </Suspense>
    </div>
  );
}
