"use client";

import * as React from "react";
import { Link as LinkIcon, User, FolderKanban, Briefcase, Search, X } from "lucide-react";
import { getTodoRelations, ContactRelation, ProjectRelation, DealRelation } from "@/app/actions/todo-relations";

interface NoteLinkMenuProps {
  onLink: (type: "contact" | "project" | "deal", id: number | null) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function NoteLinkMenu({ onLink, isOpen, onClose }: NoteLinkMenuProps) {
  const [relations, setRelations] = React.useState<{
    contacts: ContactRelation[];
    projects: ProjectRelation[];
    deals: DealRelation[];
  }>({ contacts: [], projects: [], deals: [] });
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (isOpen) {
      getTodoRelations().then(res => {
        if (res.success) setRelations(res.data);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredContacts = relations.contacts.filter(c => 
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())
  );
  const filteredProjects = relations.projects.filter(p => 
    p.project_type.toLowerCase().includes(search.toLowerCase())
  );
  const filteredDeals = relations.deals.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="absolute top-16 right-0 z-50 w-72 bg-white dark:bg-zinc-900 border border-border shadow-2xl rounded-3xl p-4 animate-in fade-in zoom-in duration-200">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Prepojiť záznam</h4>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input 
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hľadať..."
          className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-border rounded-xl text-xs font-bold outline-none focus:border-indigo-500 transition-all"
        />
      </div>

      <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-4">
        {/* Contacts */}
        {filteredContacts.length > 0 && (
          <Section title="Kontakty" icon={User} items={filteredContacts} onSelect={(id) => onLink("contact", id)} />
        )}
        
        {/* Projects */}
        {filteredProjects.length > 0 && (
          <Section title="Projekty" icon={FolderKanban} items={filteredProjects} onSelect={(id) => onLink("project", id)} labelKey="project_type" />
        )}

        {/* Deals */}
        {filteredDeals.length > 0 && (
          <Section title="Obchody" icon={Briefcase} items={filteredDeals} onSelect={(id) => onLink("deal", id)} labelKey="name" />
        )}

        {filteredContacts.length === 0 && filteredProjects.length === 0 && filteredDeals.length === 0 && (
          <div className="text-center py-8 text-xs text-muted-foreground font-bold italic">
            Žiadne výsledky
          </div>
        )}
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: any;
  items: any[];
  onSelect: (id: number) => void;
  labelKey?: string;
}

function Section({ title, icon: Icon, items, onSelect, labelKey = "full_name" }: SectionProps) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 px-2">{title}</p>
      {items.map((item: any) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-indigo-500/20 transition-colors">
            <Icon className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">
                {labelKey === "full_name" ? `${item.first_name} ${item.last_name}` : item[labelKey]}
            </p>
            {item.company && <p className="text-[10px] text-muted-foreground truncate">{item.company}</p>}
          </div>
        </button>
      ))}
    </div>
  );
}
