"use client";

import * as React from "react";
import { FileText, Sparkles, Link as LinkIcon, User, FolderKanban, Briefcase, X, Lightbulb, Database, LayoutTemplate, Tag, Folder, ChevronDown, Trash2, RefreshCw } from "lucide-react";
import { Note } from "../types";
import RichTextEditor from "@/components/dashboard/editor/RichTextEditor";
import { NoteLinkMenu } from "./NoteLinkMenu";
import { NoteTemplateRenderer } from "./NoteTemplateRenderer";

interface NoteEditorProps {
  selectedNote: Note | null;
  isSaving: boolean;
  onUpdateNote: (note: Note) => void;
  customCategories: string[];
  focusMode?: boolean;
  onToggleFocus?: () => void;
}

export function NoteEditor({
  selectedNote,
  isSaving,
  onUpdateNote,
  customCategories,
  focusMode,
  onToggleFocus,
}: NoteEditorProps) {
  const [showLinkMenu, setShowLinkMenu] = React.useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = React.useState(false);
  const [localTitle, setLocalTitle] = React.useState(selectedNote?.title || "");

  // Sync local title when note changes
  React.useEffect(() => {
    setLocalTitle(selectedNote?.title || "");
  }, [selectedNote?.id]);

  const getCategoryName = (id: string) => {
    const staticCats: Record<string, string> = {
        idea: "STRATÉGIA A NÁPADY",
        work: "PROJEKTOVÉ ÚLOHY",
        personal: "SÚKROMNÉ",
    };
    if (staticCats[id]) return staticCats[id];
    return id.toUpperCase();
  };

  if (!selectedNote) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 select-none animate-in fade-in duration-700">
        <div className="max-w-md w-full flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-[1px] bg-zinc-200 dark:bg-zinc-800" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-400">
            SELEKCIA POZNÁMKY
          </p>
          <p className="text-[11px] font-medium text-zinc-400 max-w-[200px] leading-relaxed italic">
            Zvoľte záznam zo zoznamu pre editáciu obsahu.
          </p>
        </div>
      </div>
    );
  }

  const handleLink = (type: "contact" | "project" | "deal", id: number | null) => {
    const updated = { ...selectedNote };
    if (type === "contact") updated.contact_id = id;
    if (type === "project") updated.project_id = id;
    if (type === "deal") updated.deal_id = id;
    
    onUpdateNote(updated);
    setShowLinkMenu(false);
  };

  const applyTemplate = (templateName: string) => {
    let templateContent = "";
    switch(templateName) {
      case 'audit':
        templateContent = JSON.stringify({
          type: 'strategic_audit',
          client_name: 'KLIENT S.R.O.',
          pain_points: [
            'Manuálne spracovanie dát z PDF trvá 4 hodiny denne',
            'Chýbajúca automatická synchronizácia medzi CRM a fakturáciou',
            'Vysoká chybovosť pri prepisovaní kontaktov'
          ],
          proposed_solution: 'Implementácia Custom AI Agenta na spracovanie PDF a napojenie na API CRM.',
          est_savings: 120,
          steps: ['Audit procesov', 'Vývoj Agenta', 'Beta Testovanie', 'Full Rollout']
        }, null, 2);
        break;
      case 'outreach':
        templateContent = JSON.stringify({
          type: 'outreach_strategy',
          niche: 'Statické Ateliéry',
          version: '2.1',
          hook: 'AI automatizácia realizačných projektov bez drahého softvéru.',
          pain_points: ['Nedostatok času na kreativitu', 'Rutinné PDF exporty'],
          objections: [
            { q: 'Je to bezpečné?', a: 'Používame uzavreté modely bez trénovania na dátach.' }
          ],
          follow_up_plan: [
            { day: 1, action: 'Email s PDF Case Study' },
            { day: 3, action: 'LinkedIn Connection' },
            { day: 7, action: 'SMS Reminder' }
          ]
        }, null, 2);
        break;
      case 'meeting':
        templateContent = JSON.stringify({
          type: 'meeting_intel',
          title: 'Kickoff: Automatizácia Leadov',
          date: new Date().toLocaleDateString(),
          participants: ['Andrej Repický', 'Peter - Klient'],
          takeaways: [
            'Schválený rozpočet na Q2',
            'Priorita č. 1: Gmail integrácia',
            'Potrebné zaslať NDA do piatku'
          ],
          sentiment_score: 85,
          sentiment_label: 'Veľmi Pozitívny',
          critical_next_step: 'Zaslať návrh zmluvy k podpisu.'
        }, null, 2);
        break;
    }
    onUpdateNote({ ...selectedNote, content: templateContent });
  };

  // Detect if content is JSON
  const isJson = (str: string) => {
    try {
      const cleaned = str.replace(/<[^>]*>/g, '').trim();
      if (!cleaned.startsWith('{')) return false;
      const parsed = JSON.parse(cleaned);
      return parsed;
    } catch {
      return false;
    }
  };

  const jsonData = isJson(selectedNote.content);

  return (
    <div className="flex-1 bg-transparent p-5 flex flex-col relative group min-w-0 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 shrink-0 relative">
        <div className="flex flex-wrap items-center gap-4">
          {isSaving && (
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-violet-500">
              <div className="w-1 h-1 bg-violet-500 rounded-full animate-ping" />
              <span>SYNCHRONIZÁCIA...</span>
            </div>
          )}
          
          {jsonData && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 rounded-full border border-emerald-500/10 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500">
              <Database size={12} />
              <span>SYSTÉMOVÁ ŠABLÓNA</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {selectedNote.contact_id && (
              <LinkedBadge icon={User} label="KONTAKT" onRemove={() => handleLink("contact", null)} />
            )}
            {selectedNote.project_id && (
              <LinkedBadge icon={FolderKanban} label="PROJEKT" onRemove={() => handleLink("project", null)} />
            )}
            {selectedNote.deal_id && (
              <LinkedBadge icon={Briefcase} label="OBCHOD" onRemove={() => handleLink("deal", null)} />
            )}
          </div>

          {selectedNote.deleted_at && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-full border border-red-500/20 text-[9px] font-black uppercase tracking-[0.2em] text-red-500 animate-pulse">
                <Trash2 size={12} />
                <span>POZNÁMKA V KOŠI</span>
            </div>
          )}

          {/* Category Selector */}
          <div className="relative group/cats">
              <button 
                onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/5 hover:bg-violet-500/10 rounded-full border border-violet-500/10 text-[9px] font-black uppercase tracking-[0.2em] text-violet-500 transition-all"
              >
                <Tag size={12} />
                <span>{getCategoryName(selectedNote.category || "idea")}</span>
                <ChevronDown size={10} className={`transition-transform duration-300 ${showCategoryMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {showCategoryMenu && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-2xl z-[100] p-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    {[
                        { id: 'idea', name: 'STRATÉGIA A NÁPADY', icon: Lightbulb },
                        { id: 'work', name: 'PROJEKTOVÉ ÚLOHY', icon: Briefcase },
                        { id: 'personal', name: 'SÚKROMNÉ', icon: User },
                    ].map(cat => (
                        <button 
                            key={cat.id}
                            onClick={() => {
                                onUpdateNote({ ...selectedNote, category: cat.id });
                                setShowCategoryMenu(false);
                            }}
                            className="w-full text-left p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl flex items-center gap-3 group/item transition-colors"
                        >
                            <cat.icon size={12} className="text-zinc-400 group-hover/item:text-violet-500 transition-colors" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover/item:text-zinc-900 dark:group-hover/item:text-white">{cat.name}</span>
                        </button>
                    ))}
                    <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 my-1 mx-2" />
                    {customCategories.map(catName => (
                        <button 
                            key={catName}
                            onClick={() => {
                                onUpdateNote({ ...selectedNote, category: catName.toLowerCase() });
                                setShowCategoryMenu(false);
                            }}
                            className="w-full text-left p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl flex items-center gap-3 group/item transition-colors"
                        >
                            <Folder size={12} className="text-zinc-400 group-hover/item:text-violet-500 transition-colors" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover/item:text-zinc-900 dark:group-hover/item:text-white">{catName}</span>
                        </button>
                    ))}
                  </div>
              )}
          </div>
        </div>

        <div className="flex items-center gap-3 relative">
          {!jsonData && (
            <div className="relative group/templates">
              <button 
                className="px-6 py-3 rounded-xl border border-zinc-100 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-violet-500 hover:border-violet-500/50 transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm"
              >
                <LayoutTemplate size={14} />
                <span>ŠABLÓNY</span>
              </button>
              <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-2xl opacity-0 invisible group-hover/templates:opacity-100 group-hover/templates:visible transition-all z-30 p-2">
                {[
                  { id: 'audit', name: 'AI Strategic Audit' },
                  { id: 'outreach', name: 'Outreach Blueprint' },
                  { id: 'meeting', name: 'Meeting Intelligence' },
                ].map(t => (
                  <button 
                    key={t.id}
                    onClick={() => applyTemplate(t.id)}
                    className="w-full text-left p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-violet-500 transition-colors"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <button 
              onClick={() => setShowLinkMenu(!showLinkMenu)}
              className={`px-6 py-3 rounded-xl border transition-all duration-300 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] ${
                showLinkMenu 
                  ? "bg-zinc-900 text-white border-zinc-800 shadow-xl" 
                  : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800/50 text-zinc-500 hover:border-violet-500/50 hover:text-violet-500 shadow-sm"
              }`}
            >
              <LinkIcon size={14} />
              <span>PRIRADIŤ ENTITU</span>
            </button>

            <NoteLinkMenu 
              isOpen={showLinkMenu} 
              onClose={() => setShowLinkMenu(false)} 
              onLink={handleLink}
            />
          </div>

          {selectedNote.deleted_at && (
            <button 
                onClick={() => onUpdateNote({ ...selectedNote, deleted_at: null })}
                className="px-6 py-3 rounded-xl bg-violet-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/20 flex items-center gap-2"
            >
                <RefreshCw size={14} />
                OBNOVIŤ POZNÁMKU
            </button>
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col transition-all duration-700 ${focusMode ? 'max-w-4xl mx-auto w-full pt-10' : 'w-full'} ${selectedNote.deleted_at ? 'opacity-50 pointer-events-none' : ''}`}>
        <input
          className="w-full text-2xl font-black tracking-widest text-foreground py-2 outline-none !bg-transparent border-none focus:ring-0 leading-none uppercase placeholder:text-zinc-300 dark:placeholder:text-zinc-700 transition-all"
          value={localTitle}
          disabled={!!selectedNote.deleted_at}
          onChange={(e) => {
            const val = e.target.value;
            setLocalTitle(val);
            onUpdateNote({ ...selectedNote, title: val });
          }}
          placeholder="TITULOK POZNÁMKY..."
        />
        <div className="h-px w-full bg-gradient-to-r from-violet-500/30 via-violet-500/10 to-transparent mb-6" />

        <div className="flex-1 px-1 min-h-0 pb-2 flex flex-col">
          {jsonData ? (
            <NoteTemplateRenderer 
              data={jsonData} 
              onUpdate={(updatedData) => onUpdateNote({ ...selectedNote, content: JSON.stringify(updatedData) })}
            />
          ) : (
            <RichTextEditor
              content={selectedNote.content}
              onChange={(content) => onUpdateNote({ ...selectedNote, content })}
              placeholder="Začnite písať..."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function LinkedBadge({ icon: Icon, label, onRemove }: { icon: any, label: string, onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/50 rounded-xl transition-all group/badge">
      <Icon size={12} className="text-violet-500" />
      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">{label}</span>
      <button 
        onClick={onRemove}
        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-all opacity-0 group-hover/badge:opacity-100"
      >
        <X size={12} className="text-zinc-400" />
      </button>
    </div>
  );
}
