"use client";

import * as React from "react";
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  AlignLeft,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date;
}

("use client");

import * as React from "react";
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  AlignLeft,
  Loader2,
  Repeat,
  Bell,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createCalendarEvent } from "@/app/actions/calendar";
import {
  getTodoRelations,
  ContactRelation,
  ProjectRelation,
} from "@/app/actions/todo-relations";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date;
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

export function CreateEventModal({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
}: CreateEventModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [isAllDay, setIsAllDay] = React.useState(false);
  const [isReminder, setIsReminder] = React.useState(false); // Single time point logic
  const [suggestions, setSuggestions] = React.useState<any[]>([]);
  const [relations, setRelations] = React.useState<{
    contacts: ContactRelation[];
    projects: ProjectRelation[];
  }>({ contacts: [], projects: [] });

  // Load relations for autocomplete
  React.useEffect(() => {
    if (isOpen) {
      getTodoRelations().then((res) => {
        if (res.success) setRelations(res.data);
      });
    }
  }, [isOpen]);

  const [formData, setFormData] = React.useState({
    summary: "",
    description: "",
    location: "",
    recurrence: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    startTime: "10:00",
    endDate: format(new Date(), "yyyy-MM-dd"),
    endTime: "11:00",
  });

  React.useEffect(() => {
    if (initialDate) {
      const dateStr = format(initialDate, "yyyy-MM-dd");
      setFormData((prev) => ({
        ...prev,
        startDate: dateStr,
        endDate: dateStr,
        startTime: format(new Date(), "HH:mm"),
        endTime: format(
          new Date(new Date().getTime() + 60 * 60 * 1000),
          "HH:mm",
        ),
      }));
    }
  }, [initialDate, isOpen]);

  // Autocomplete Logic
  const handleSummaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, summary: val }));

    // Simple logic: if type 3 chars look for match
    const words = val.split(" ");
    const lastWord = words[words.length - 1];

    if (lastWord.length >= 2) {
      const query = lastWord.toLowerCase().replace(/^[@#]/, "");
      const matchedContacts = relations.contacts
        .filter((c) =>
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(query),
        )
        .map((c) => ({
          label: `${c.first_name} ${c.last_name}`,
          type: "contact",
        }))
        .slice(0, 3);

      const matchedProjects = relations.projects
        .filter((p) => p.project_type.toLowerCase().includes(query))
        .map((p) => ({ label: p.project_type, type: "project" }))
        .slice(0, 3);

      setSuggestions([...matchedContacts, ...matchedProjects]);
    } else {
      setSuggestions([]);
    }
  };

  const applySuggestion = (suggestion: { label: string; type: string }) => {
    const words = formData.summary.split(" ");
    words.pop(); // remove partial word
    const newSummary = [...words, suggestion.label].join(" ") + " ";
    setFormData((prev) => ({ ...prev, summary: newSummary }));
    setSuggestions([]);

    // Auto-add description context
    if (suggestion.type === "project") {
      setFormData((prev) => ({
        ...prev,
        description: prev.description + `\nProjekt: ${suggestion.label}`,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        description: prev.description + `\nKontakt: ${suggestion.label}`,
      }));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let start, end;

      if (isAllDay) {
        // All day event: ONLY DATE, no time part
        start = { date: formData.startDate };
        end = { date: formData.endDate };
        // Note: Google Calendar requires end date to be exclusive for all-day events, usually +1 day
        // But let's verify if simple date works. Usually end date should be startDate + 1 day for single day event.
        if (formData.startDate === formData.endDate) {
          const d = new Date(formData.endDate);
          d.setDate(d.getDate() + 1);
          end = { date: format(d, "yyyy-MM-dd") };
        }
      } else {
        start = {
          dateTime: new Date(
            `${formData.startDate}T${formData.startTime}:00`,
          ).toISOString(),
        };

        if (isReminder) {
          // Reminder logic: Same start and end time (instant)
          end = { dateTime: start.dateTime };
        } else {
          end = {
            dateTime: new Date(
              `${formData.endDate}T${formData.endTime}:00`,
            ).toISOString(),
          };
        }
      }

      const res = await createCalendarEvent({
        summary: formData.summary,
        description: formData.description,
        location: formData.location,
        start,
        end,
        recurrence: formData.recurrence ? [formData.recurrence] : undefined,
      });

      if (res.success) {
        toast.success("Udalosť bola vytvorená");
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || "Nepodarilo sa vytvoriť udalosť");
      }
    } catch (error) {
      toast.error("Systémová chyba pri vytváraní udalosti");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100 max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              Nová udalosť
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-8 space-y-6 overflow-y-auto custom-scrollbar"
        >
          {/* Title & Suggestions */}
          <div className="relative">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block px-1">
              Názov udalosti
            </label>
            <input
              required
              type="text"
              placeholder="Stretnutie s @... alebo #..."
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all font-bold text-gray-900 placeholder:font-medium placeholder:text-gray-300"
              value={formData.summary}
              onChange={handleSummaryChange}
            />
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden divide-y divide-gray-100">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                  >
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${s.type === "contact" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"} font-bold uppercase`}
                    >
                      {s.type === "contact" ? "@" : "#"}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors flex-1">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                Celý deň
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors flex-1">
              <input
                type="checkbox"
                checked={isReminder}
                onChange={(e) => setIsReminder(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                Pripomienka
              </span>
            </label>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block px-1">
                Začiatok
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:bg-white outline-none font-medium"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
                {!isAllDay && (
                  <input
                    type="time"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:bg-white outline-none font-medium"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                  />
                )}
              </div>
            </div>

            {!isReminder && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block px-1">
                  Koniec
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:bg-white outline-none font-medium"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    disabled={
                      isAllDay && formData.startDate === formData.endDate
                    } // Auto-handle same day logic visually
                  />
                  {!isAllDay && (
                    <input
                      type="time"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:bg-white outline-none font-medium"
                      value={formData.endTime}
                      onChange={(e) =>
                        setFormData({ ...formData, endTime: e.target.value })
                      }
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Recurrence */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block px-1">
              Opakovanie
            </label>
            <div className="relative">
              <Repeat className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:bg-white outline-none appearance-none font-medium"
                value={formData.recurrence}
                onChange={(e) =>
                  setFormData({ ...formData, recurrence: e.target.value })
                }
              >
                {RECURRENCE.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block px-1">
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
                      setFormData((prev) => ({ ...prev, location: loc.value }))
                    }
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${isSelected ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100"}`}
                  >
                    <Icon
                      className={`w-4 h-4 ${isSelected ? "text-blue-500" : "text-gray-400"}`}
                    />
                    <span className="text-xs font-bold">{loc.label}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 ml-auto text-blue-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block px-1">
              Popis
            </label>
            <div className="relative">
              <AlignLeft className="absolute left-4 top-4 w-4 h-4 text-gray-300" />
              <textarea
                rows={3}
                placeholder="Detaily udalosti..."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-5 py-3 text-sm focus:bg-white outline-none resize-none"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-sm font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
            >
              Zrušiť
            </button>
            <button
              disabled={loading}
              type="submit"
              className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 font-black uppercase tracking-widest shadow-xl shadow-blue-100 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Vytvoriť"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
