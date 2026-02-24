"use client";

import * as React from "react";
import {
  Square,
  MinusSquare,
  CheckSquare,
  RefreshCcw, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight,
  Search,
  RefreshCw
} from "lucide-react";

interface LeadsHeaderProps {
  isConnected: boolean;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  onConnect: () => void;
  totalCount?: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  selectedCount?: number;
  totalVisibleCount?: number;
  onToggleSelectAll?: () => void;
  onClearSelection?: () => void;
}

export function LeadsHeader({
  isConnected,
  loading,
  searchQuery,
  onSearchChange,
  onRefresh,
  onConnect,
  totalCount = 0,
  currentPage,
  totalPages,
  onPageChange,
  selectedCount = 0,
  totalVisibleCount = 0,
  onToggleSelectAll,
  onClearSelection,
}: LeadsHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="px-6 h-14 flex items-center justify-between bg-transparent relative z-20 gap-8">
      {/* Left Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0 relative">
        <button 
          onClick={() => {
            if (selectedCount > 0) {
              onClearSelection?.();
              import('sonner').then(({ toast }) => toast.success("Výber zrušený"));
            } else {
              import('sonner').then(({ toast }) => toast.info("Vyberte si správy", { description: "Klikajte priamo na malý štvorček pri konkrétnom maily." }));
            }
          }}
          className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/40 rounded-full transition-all text-[#444746] dark:text-zinc-400 group"
          title={selectedCount > 0 ? "Zrušiť všetok výber" : "Hromadný výber (Deaktivovaný)"}
        >
          {selectedCount === 0 ? (
            <Square className="w-5 h-5 group-hover:text-violet-600 transition-colors opacity-50" />
          ) : (
            <MinusSquare className="w-5 h-5 text-violet-600 drop-shadow-[0_0_5px_rgba(139,92,246,0.3)]" />
          )}
        </button>
        
        {/* Refresh button with glowing spinner state */}
        <div className="relative">
          {loading && (
             <div className="absolute inset-0 bg-violet-500 rounded-full blur-[8px] animate-pulse opacity-40"></div>
          )}
          <button 
            onClick={() => {
              if (!loading) {
                import('sonner').then(({ toast }) => toast('Synchronizácia schránky', { 
                  icon: '🔄',
                  description: 'Vyhľadávam nové správy na serveroch Gmail...' 
                }));
                onRefresh();
              }
            }}
            className={`p-2 relative z-10 rounded-full transition-all group ${loading ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600' : 'hover:bg-violet-50 dark:hover:bg-violet-900/40 text-[#444746] dark:text-zinc-400'}`}
            title="Obnoviť schránku"
          >
            <RefreshCw className={`w-5 h-5 group-hover:text-violet-600 transition-colors ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* 3 Dots Menu */}
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`p-2 rounded-full transition-all group ${isMenuOpen ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/50' : 'hover:bg-violet-50 dark:hover:bg-violet-900/40 text-[#444746] dark:text-zinc-400'}`}
            title="Ďalšie možnosti"
          >
            <MoreVertical className="w-5 h-5 group-hover:text-violet-600 transition-colors" />
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute top-full lg:left-0 left-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <button 
                  onClick={() => {
                    setIsMenuOpen(false);
                    import('sonner').then(({ toast }) => toast.info("Na funkcii hromadného označenia ako prečítané sa pracuje."));
                  }} 
                  className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 transition-colors"
                >
                  Označiť všetko ako prečítané
                </button>
                <button 
                  onClick={() => {
                    setIsMenuOpen(false);
                    import('sonner').then(({ toast }) => toast.info("Systémové nastavenia účtu", { description: "Budú čoskoro presunuté do profilu." }));
                  }} 
                  className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 transition-colors"
                >
                  Nastavenia schránky
                </button>
                <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1 mx-2"></div>
                <button 
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (selectedCount > 0) import('sonner').then(({ toast }) => toast.info(`Hromadný archív pre ${selectedCount} správ(y) príde v 1.1.`));
                    else import('sonner').then(({ toast }) => toast.error("Najprv vyberte aspoň jednu správu."));
                  }} 
                  className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 transition-colors flex items-center justify-between"
                >
                  Hromadný archív
                  {selectedCount > 0 && <span className="bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded text-[10px]">{selectedCount}</span>}
                </button>
              </div>
            </>
          )}
        </div>

        {!isConnected && !loading && (
          <button
            onClick={onConnect}
            className="ml-4 px-5 py-2 rounded-[0.9rem] text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 relative overflow-hidden group"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.35) 0%, rgba(109,40,217,0.25) 100%)",
              border: "1.5px solid rgba(167,139,250,0.5)",
              boxShadow: "0 4px 20px rgba(124,58,237,0.25), inset 0 1px 0 rgba(196,181,253,0.2)",
              color: "rgba(255,255,255,0.95)"
            }}
          >
            Prepojiť Gmail
          </button>
        )}
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-2xl relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-zinc-400 group-focus-within:text-violet-500 transition-colors" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Hľadať v správach..."
          className="w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.03] dark:border-white/[0.05] rounded-[1rem] py-2 pl-11 pr-4 text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:bg-white dark:focus:bg-zinc-900 transition-all placeholder:text-zinc-400 placeholder:font-medium"
        />
      </div>

      {/* Right Actions / Pagination */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-[11px] font-black text-[#444746] dark:text-zinc-500 uppercase tracking-widest tabular-nums">
          {totalCount > 0 
            ? `Strana ${currentPage} z ${totalPages}` 
            : "Strana 0 z 0"
          }
        </div>
        <div className="flex items-center gap-0.5">
          <button 
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/40 rounded-full transition-all disabled:opacity-20 text-[#444746] dark:text-zinc-400 group"
          >
            <ChevronLeft className="w-5 h-5 group-hover:text-violet-600 transition-colors" />
          </button>
          <button 
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/40 rounded-full transition-all disabled:opacity-20 text-[#444746] dark:text-zinc-400 group"
          >
            <ChevronRight className="w-5 h-5 group-hover:text-violet-600 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}
