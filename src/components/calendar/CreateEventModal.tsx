"use client";

import * as React from "react";
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  AlignLeft,
  Loader2,
  Repeat,
  Check,
  User,
  FolderKanban,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createCalendarEvent, updateCalendarEvent } from "@/app/actions/calendar";
import {
  getTodoRelations,
  ContactRelation,
  ProjectRelation,
} from "@/app/actions/todo-relations";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { MentionNode } from "@/lib/tiptap-mention-node";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import { AutocompleteDropdown } from "@/components/editor/AutocompleteDropdown";
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";
import { PremiumTimePicker } from "@/components/ui/PremiumTimePicker";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (event?: any) => void;
  initialDate?: Date;
  initialEvent?: any;
}

interface Mention {
  id: string | number;
  label: string;
  type: "contact" | "project";
}

const LOCATIONS = [
  { label: "Osobne", value: "In Person", icon: MapPin },
  { label: "Google Meet", value: "Google Meet", icon: CalendarIcon },
  { label: "Telefón", value: "Phone Call", icon: Clock },
  { label: "Online", value: "Online", icon: Clock },
];

const RECURRENCE = [
  { label: "Neopakovať", value: "" },
  { label: "Denne", value: "RRULE:FREQ=DAILY" },
  { label: "Týždenne", value: "RRULE:FREQ=WEEKLY" },
  { label: "Mesačne", value: "RRULE:FREQ=MONTHLY" },
  { label: "Ročne", value: "RRULE:FREQ=YEARLY" },
];

const normalizeText = (text: string) => {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

export function CreateEventModal({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  initialEvent,
}: CreateEventModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [isAllDay, setIsAllDay] = React.useState(false);
  const [isReminder, setIsReminder] = React.useState(false);

  // Smart Editor State
  const {
    suggestions,
    position,
    selectedIndex,
    checkAutocomplete,
    selectSuggestion,
    handleKeyDown: handleAutocompleteKeyDown,
  } = useAutocomplete();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        heading: false,
      }),
      MentionNode,
      Placeholder.configure({
        placeholder: "Čo ideme plánovať?",
      }),
    ],
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 focus:bg-white/10 focus:border-violet-500/30 outline-none transition-all font-semibold text-white placeholder:font-medium placeholder:text-zinc-600 min-h-[65px] text-base tracking-normal",
      },
      handleKeyDown: (view, event): boolean => {
        if (!view || !view.state) return false;
        return handleAutocompleteKeyDown(event, view as any);
      },
    },
    onUpdate: ({ editor }) => {
      checkAutocomplete(editor);
    },
  });

  const [mentions, setMentions] = React.useState<Mention[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [relations, setRelations] = React.useState<{
    contacts: ContactRelation[];
    projects: ProjectRelation[];
  }>({ contacts: [], projects: [] });

  // Load relations
  React.useEffect(() => {
    if (isOpen && editor) {
      if (initialEvent) {
          editor.commands.setContent(initialEvent.title || initialEvent.summary || "");
      } else {
          editor.commands.clearContent();
      }
      setMentions([]);
    }
  }, [isOpen, editor, initialEvent]);

  const [formData, setFormData] = React.useState({
    description: "",
    location: "",
    recurrence: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    startTime: "10:00",
    endDate: format(new Date(), "yyyy-MM-dd"),
    endTime: "11:00",
  });

  React.useEffect(() => {
    if (isOpen) {
      if (initialEvent) {
        setFormData({
          description: initialEvent.description || "",
          location: initialEvent.location || "",
          recurrence: initialEvent.recurrence?.[0] || "",
          startDate: format(initialEvent.start, "yyyy-MM-dd"),
          startTime: format(initialEvent.start, "HH:mm"),
          endDate: format(initialEvent.end, "yyyy-MM-dd"),
          endTime: format(initialEvent.end, "HH:mm"),
        });
        setIsAllDay(!!initialEvent.allDay);
      } else if (initialDate) {
        const dateStr = format(initialDate, "yyyy-MM-dd");
        
        // Round current time to nearest 15 minutes for better picker compatibility
        const now = new Date();
        const minutes = now.getMinutes();
        const roundedMinutes = Math.round(minutes / 15) * 15;
        const start = new Date(now);
        start.setMinutes(roundedMinutes, 0, 0);
        
        const end = new Date(start.getTime() + 60 * 60 * 1000);

        setFormData((prev) => ({
          ...prev,
          startDate: dateStr,
          endDate: dateStr,
          startTime: format(start, "HH:mm"),
          endTime: format(end, "HH:mm"),
        }));
      }
    }
  }, [initialDate, isOpen, initialEvent]);

  // Build the full summary text (for Google Calendar)
  const buildSummaryText = () => {
    return editor?.getText() || "";
  };

  const applySuggestion = (suggestion: any) => {
    if (!editor) return;

    selectSuggestion(suggestion, editor);

    // Track mentions for data linking
    setMentions(prev => [...prev, suggestion]);

    // Auto-add to description
    setFormData((prev) => ({
      ...prev,
      description: prev.description
        ? prev.description +
          `\n${suggestion.type === "contact" ? "Kontakt" : "Projekt"}: ${suggestion.label}`
        : `${suggestion.type === "contact" ? "Kontakt" : "Projekt"}: ${suggestion.label}`,
    }));
  };

  // --- End Autocomplete Logic ---

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (suggestions.length > 0) return;

    const summary = buildSummaryText();
    if (!summary.trim()) {
      toast.error("Zadajte názov udalosti");
      return;
    }

    setLoading(true);

    try {
      let start, end;

      if (isAllDay) {
        start = { date: formData.startDate };
        if (formData.startDate === formData.endDate) {
          const d = new Date(formData.endDate);
          d.setDate(d.getDate() + 1);
          end = { date: format(d, "yyyy-MM-dd") };
        } else {
          end = { date: formData.endDate };
        }
      } else {
        try {
          // Robust date parsing from fragments
          const [sYear, sMonth, sDay] = formData.startDate.split('-').map(Number);
          const [sHour, sMinute] = formData.startTime.split(':').map(Number);
          const startDateObj = new Date(sYear, sMonth - 1, sDay, sHour, sMinute);
          
          if (isNaN(startDateObj.getTime())) throw new Error("Invalid start date");
          
          start = { dateTime: startDateObj.toISOString() };

          if (isReminder) {
            end = { dateTime: start.dateTime };
          } else {
            const [eYear, eMonth, eDay] = formData.endDate.split('-').map(Number);
            const [eHour, eMinute] = formData.endTime.split(':').map(Number);
            const endDateObj = new Date(eYear, eMonth - 1, eDay, eHour, eMinute);
            
            if (isNaN(endDateObj.getTime())) throw new Error("Invalid end date");
            
            end = { dateTime: endDateObj.toISOString() };
          }
        } catch (e) {
          toast.error("Chybný formát dátumu alebo času");
          setLoading(false);
          return;
        }
      }

      const contactMention = mentions.find(m => m.type === 'contact');
      const projectMention = mentions.find(m => m.type === 'project');

      const extendedProperties = {
        private: {
          type: projectMention ? "project" : contactMention ? "contact" : undefined,
          id: projectMention ? String(projectMention.id) : contactMention ? String(contactMention.id) : undefined,
          contactId: contactMention ? String(contactMention.id) : undefined
        }
      };

      const eventPayload = {
        summary,
        description: formData.description,
        location: formData.location,
        start,
        end,
        recurrence: formData.recurrence ? [formData.recurrence] : undefined,
        extendedProperties,
      };

      const res = initialEvent?.id 
        ? await updateCalendarEvent(initialEvent.id, eventPayload)
        : await createCalendarEvent(eventPayload);

      if (res.success) {
        toast.success(initialEvent ? "Udalosť bola upravená" : "Udalosť bola vytvorená");
        
        // Log activity to contact timeline if tagged
        if (contactMention) {
          try {
            const { executeDbActivityTool } = await import("@/app/actions/executors-db-activities");
            await executeDbActivityTool("db_create_activity", {
              contact_id: Number(contactMention.id),
              type: "meeting",
              subject: `Kalendár: ${summary}`,
              content: `Naplánovaná udalosť v kalendári. ${formData.location ? `Miesto: ${formData.location}` : ''}`,
            }, "system@arcigy.cloud");
          } catch (activityError) {
            console.error("Failed to log calendar activity:", activityError);
          }
        }

        onSuccess(res.event);
        onClose();
      } else {
        toast.error(res.error || `Nepodarilo sa ${initialEvent ? 'upraviť' : 'vytvoriť'} udalosť`);
      }
    } catch (error) {
      toast.error(`Systémová chyba pri ${initialEvent ? 'upravovaní' : 'vytváraní'} udalosti`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-500"
        onClick={onClose}
      />

      <div className="bg-[#050507]/95 backdrop-blur-3xl w-full max-w-lg rounded-[2.5rem] shadow-[0_25px_80px_rgba(0,0,0,0.8),0_0_50px_rgba(124,58,237,0.05)] relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 border border-white/[0.05] max-h-[95vh]">
        <div className="p-5 border-b border-white/[0.03] flex items-center justify-between bg-black/40">
          <div className="flex-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-400 italic mb-1">
              {initialEvent ? 'Upraviť udalosť' : 'Nová udalosť'}
            </h2>
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest italic">
              {initialEvent ? 'Zmeňte detaily vašej aktivity' : 'Naplánujte si niečo nové'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-2xl transition-all group"
          >
            <X className="w-6 h-6 transition-all" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5 space-y-3 overflow-y-auto scrollbar-hide"
        >
          <div className="relative">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3 block px-1">
              Poznámka do kalendára
            </label>

            <EditorContent editor={editor} />

            <AutocompleteDropdown
              suggestions={suggestions}
              position={position}
              selectedIndex={selectedIndex}
              onSelect={applySuggestion}
            />
            <p className="mt-2 text-[9px] text-zinc-500 italic px-1">
              Tento text sa zobrazí priamo v políčku kalendára. Použite @ pre kontakt/projekt.
            </p>
          </div>

          {/* Toggles */}
          <div className="flex gap-4">
            <label className="flex items-center gap-3 cursor-pointer bg-white/5 px-5 py-2.5 rounded-2xl border border-white/5 hover:border-violet-500/30 transition-all flex-1 group">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="w-4 h-4 rounded-lg bg-zinc-800 border-white/10 text-violet-600 focus:ring-violet-500 focus:ring-offset-0 transition-all cursor-pointer"
              />
              <span className="text-[10px] font-black text-zinc-400 group-hover:text-white uppercase tracking-[0.1em] italic transition-colors">
                Celý deň
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer bg-white/5 px-5 py-2.5 rounded-2xl border border-white/5 hover:border-violet-500/30 transition-all flex-1 group">
              <input
                type="checkbox"
                checked={isReminder}
                onChange={(e) => setIsReminder(e.target.checked)}
                className="w-4 h-4 rounded-lg bg-zinc-800 border-white/10 text-violet-600 focus:ring-violet-500 focus:ring-offset-0 transition-all cursor-pointer"
              />
              <span className="text-[10px] font-black text-zinc-400 group-hover:text-white uppercase tracking-[0.1em] italic transition-colors">
                Pripomienka
              </span>
            </label>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1 block px-1">
                Kedy
              </label>
              <div className="space-y-2">
                <PremiumDatePicker
                  value={formData.startDate}
                  onChange={(v) =>
                    setFormData({ ...formData, startDate: v })
                  }
                />
                {!isAllDay && (
                  <PremiumTimePicker
                    value={formData.startTime}
                    onChange={(v) =>
                      setFormData({ ...formData, startTime: v })
                    }
                  />
                )}
              </div>
            </div>

            {!isReminder && (
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1 block px-1">
                  Do
                </label>
                <div className="space-y-2">
                  <PremiumDatePicker
                    value={formData.endDate}
                    onChange={(v) =>
                      setFormData({ ...formData, endDate: v })
                    }
                  />
                  {!isAllDay && (
                    <PremiumTimePicker
                      value={formData.endTime}
                      onChange={(v) =>
                        setFormData({ ...formData, endTime: v })
                      }
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Location & Additional Details */}
          <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3 block px-1">
                  Lokalita
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LOCATIONS.map((loc) => {
                    const Icon = loc.icon;
                    const isSelected = formData.location === loc.value;
                    return (
                      <button
                        key={loc.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            location: prev.location === loc.value ? "" : loc.value,
                          }))
                        }
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-300 relative overflow-hidden group/loc
                            ${isSelected ? "bg-violet-600 text-white border-transparent shadow-[0_5px_15px_rgba(139,92,246,0.3)]" : "bg-white/5 border-white/5 text-zinc-500 hover:text-white hover:bg-white/10"}`}
                      >
                        <Icon
                          className={`w-3.5 h-3.5 relative z-10 transition-colors ${isSelected ? "text-white" : "text-zinc-600 group-hover/loc:text-violet-400"}`}
                        />
                        <span className="text-[10px] font-black uppercase italic tracking-tight relative z-10">{loc.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3 block px-1">
                  Doplňujúce detaily
                </label>
                <div className="relative group/area">
                  <div className="absolute left-4 top-4 p-1.5 bg-zinc-800/50 rounded-lg group-focus-within/area:bg-violet-500/10 transition-colors">
                    <AlignLeft className="w-3.5 h-3.5 text-zinc-600 group-focus-within/area:text-violet-500 transition-colors" />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Miesto pre podrobnejší rozpis (voliteľné)..."
                    className="w-full bg-white/5 border border-white/5 rounded-[1.5rem] pl-14 pr-6 py-4 text-[11px] font-bold text-zinc-400 italic focus:bg-white/10 focus:border-violet-500/20 outline-none resize-none transition-all placeholder:text-zinc-700"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              disabled={loading}
              type="submit"
              className="flex-1 h-12 bg-violet-600 hover:bg-violet-500 text-white rounded-[1.5rem] font-bold uppercase tracking-[0.15em] shadow-[0_10px_30px_rgba(139,92,246,0.3)] disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                    <Check className="w-5 h-5" />
                    <span>{initialEvent ? 'Uložiť zmeny' : 'Vytvoriť udalosť'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

