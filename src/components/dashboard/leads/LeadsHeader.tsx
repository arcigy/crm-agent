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
  RefreshCw,
  X,
  Trash2,
  Zap
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
  onBulkArchive?: () => void;
  onBulkTag?: (tag: string) => void;
  onEmptyTrash?: () => void;
  currentTab?: string;
  gmailLabels?: any[];
  isBuffering?: boolean;
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
  onBulkArchive,
  onBulkTag,
  onEmptyTrash,
  currentTab,
  gmailLabels = [],
  isBuffering = false,
}: LeadsHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isTagSubMenuOpen, setIsTagSubMenuOpen] = React.useState(false);

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
              onToggleSelectAll?.();
            }
          }}
          className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/40 rounded-full transition-all text-[#444746] dark:text-zinc-400 group"
          title={selectedCount > 0 ? "Zrušiť všetok výber" : "Hromadný výber"}
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

        {/* Visible Empty Trash Button */}
        {currentTab === "trash" && (
          <button 
            onClick={() => {
              if (window.confirm("Naozaj chcete natrvalo odstrániť všetky správy v koši? Tieto maily už nebude možné obnoviť.")) {
                onEmptyTrash?.();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all text-[11px] font-black uppercase tracking-wider"
            title="Natrvalo vyprázdniť kôš"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Vysypať kôš
          </button>
        )}

        {/* 3 Dots Menu */}
        <div className="relative">
          <button 
            onClick={() => {
              setIsMenuOpen(!isMenuOpen);
              setIsTagSubMenuOpen(false);
            }}
            className={`p-2 rounded-full transition-all group ${isMenuOpen ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/50' : 'hover:bg-violet-50 dark:hover:bg-violet-900/40 text-[#444746] dark:text-zinc-400'}`}
            title="Ďalšie možnosti"
          >
            <MoreVertical className="w-5 h-5 group-hover:text-violet-600 transition-colors" />
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => { setIsMenuOpen(false); setIsTagSubMenuOpen(false); }} />
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
                    window.location.href = '/dashboard/settings';
                  }} 
                  className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 transition-colors"
                >
                  Nastavenia schránky
                </button>
                <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1 mx-2"></div>
                <button 
                  onClick={() => {
                    if (selectedCount > 0) {
                      onBulkArchive?.();
                      onClearSelection?.();
                      setIsMenuOpen(false);
                    } else import('sonner').then(({ toast }) => toast.error("Najprv vyberte aspoň jednu správu."));
                  }} 
                  className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 transition-colors flex items-center justify-between"
                >
                  Hromadný archív
                  {selectedCount > 0 && <span className="bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded text-[10px]">{selectedCount}</span>}
                </button>
                
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedCount > 0) {
                        setIsTagSubMenuOpen(!isTagSubMenuOpen);
                      } else import('sonner').then(({ toast }) => toast.error("Najprv vyberte aspoň jednu správu."));
                    }} 
                    onMouseEnter={() => selectedCount > 0 && setIsTagSubMenuOpen(true)}
                    className={`w-full text-left px-4 py-2.5 text-[13px] font-bold transition-colors flex items-center justify-between ${isTagSubMenuOpen ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20' : 'text-zinc-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700'}`}
                  >
                    Označiť štítkom
                    {selectedCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded text-[10px]">{selectedCount}</span>
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isTagSubMenuOpen ? 'rotate-90' : ''}`} />
                      </div>
                    )}
                  </button>

                  {isTagSubMenuOpen && selectedCount > 0 && (
                    <div 
                      className="absolute left-full top-0 ml-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl py-2 z-[60] animate-in fade-in slide-in-from-left-2 duration-200 max-h-[300px] overflow-y-auto thin-scrollbar"
                      onMouseLeave={() => setIsTagSubMenuOpen(false)}
                    >
                      <div className="px-4 py-1 mb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Existujúce štítky</span>
                      </div>
                      {gmailLabels.length === 0 ? (
                        <div className="px-4 py-2 text-[11px] italic text-zinc-500 text-center">Žiadne štítky</div>
                      ) : (
                        gmailLabels.map((label: any) => (
                          <button
                            key={label.name}
                            onClick={() => {
                              onBulkTag?.(label.name);
                              setIsMenuOpen(false);
                              setIsTagSubMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-[12px] font-bold text-zinc-600 dark:text-zinc-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 transition-colors flex items-center gap-2"
                          >
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color || '#8b5cf6' }} />
                            <span className="truncate">{label.name}</span>
                          </button>
                        ))
                      )}
                      <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1 mx-2"></div>
                      <button
                        onClick={() => {
                          const newTag = window.prompt("Zadaj názov nového štítku:");
                          if (newTag && newTag.trim() && onBulkTag) {
                            onBulkTag(newTag.trim());
                            setIsMenuOpen(false);
                            setIsTagSubMenuOpen(false);
                          }
                        }}
                        className="w-full text-left px-4 py-2 text-[12px] font-black uppercase text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                      >
                        + Nový štítok
                      </button>
                    </div>
                  )}
                </div>

                {currentTab === "trash" && (
                  <>
                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1 mx-2"></div>
                    <button 
                      onClick={() => {
                        setIsMenuOpen(false);
                        onEmptyTrash?.();
                      }} 
                      className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                    >
                      <X className="w-3.5 h-3.5" /> Vysypať kôš
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {!isConnected && (
          <button
            onClick={onConnect}
            disabled={loading}
            className={`ml-4 px-5 py-2 rounded-[0.9rem] text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 relative overflow-hidden group ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.35) 0%, rgba(109,40,217,0.25) 100%)",
              border: "1.5px solid rgba(167,139,250,0.5)",
              boxShadow: "0 4px 20px rgba(124,58,237,0.25), inset 0 1px 0 rgba(196,181,253,0.2)",
              color: "rgba(255,255,255,0.95)"
            }}
          >
            {loading ? "Overujem..." : "Prepojiť Gmail"}
          </button>
        )}
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-2xl relative group mx-4 transition-all duration-300">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10">
          <Search className={`h-[18px] w-[18px] transition-all duration-300 ${searchQuery ? 'text-violet-500 font-bold scale-110' : 'text-zinc-400 group-focus-within:text-violet-500'}`} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Hľadať v správach..."
          className="w-full bg-black/5 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-2xl py-2.5 pl-12 pr-10 text-[14px] font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:bg-white dark:focus:bg-[#12141a] transition-all placeholder:text-zinc-500 placeholder:font-medium shadow-sm hover:bg-black/[0.07] dark:hover:bg-white/10"
        />
        {searchQuery && (
          <button 
            onClick={() => onSearchChange("")}
            className="absolute inset-y-0 right-3 flex items-center justify-center text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            title="Vymazať vyhľadávanie"
          >
            <div className="p-1 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-full transition-all">
               <X className="w-4 h-4" />
            </div>
          </button>
        )}
      </div>

      {/* Right Actions / Pagination */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          {isBuffering && (
            <div className="flex items-center gap-1.5 animate-pulse" title="Načítavanie archívu na pozadí...">
              <Zap className="w-3.5 h-3.5 text-violet-500 fill-violet-500/20" />
              <span className="text-[10px] font-black text-violet-500/60 uppercase tracking-tighter">Syncing</span>
            </div>
          )}
          <div className="text-[11px] font-black text-[#444746] dark:text-zinc-500 uppercase tracking-widest tabular-nums">
            {totalCount > 0 
              ? `Strana ${currentPage} z ${totalPages}` 
              : "Strana 0 z 0"
            }
          </div>
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
