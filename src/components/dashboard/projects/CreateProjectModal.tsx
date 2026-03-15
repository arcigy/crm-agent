"use client";

import * as React from "react";
import { X, Plus, Loader2 } from "lucide-react";
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";
import { ProjectStage, PROJECT_TYPES, PROJECT_STAGES } from "@/types/project";
import { Lead } from "@/types/contact";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  contacts: Lead[];
  initialMode?: "form" | "json";
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onSubmit,
  contacts,
  initialMode = "form",
}: CreateProjectModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [mode, setMode] = React.useState<"form" | "json">(initialMode);
  const [jsonInput, setJsonInput] = React.useState("");
  const [formData, setFormData] = React.useState({
    name: "",
    project_type: PROJECT_TYPES[0],
    contact_id: "",
    stage: "planning" as ProjectStage,
    end_date: "",
  });

  React.useEffect(() => {
    if (isOpen) setMode(initialMode);
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "json") {
        const parsed = JSON.parse(jsonInput);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          await onSubmit({
            name: item.name || item.title || "Nový projekt",
            project_type: item.type || item.project_type || PROJECT_TYPES[0],
            contact_id: item.contact_id ? parseInt(item.contact_id) : null,
            stage: item.stage || "planning",
            end_date: item.end_date || null,
          });
        }
      } else {
        await onSubmit({
          ...formData,
          contact_id: formData.contact_id
            ? parseInt(formData.contact_id)
            : null,
          end_date: formData.end_date || null,
        });
      }
      onClose();
      window.location.reload();
    } catch (err) {
      alert(mode === "json" ? "Neplatný JSON" : "Chyba pri vytváraní");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-in fade-in duration-500">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-[#050507]/95 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl w-full max-w-xl p-6 relative border border-white/[0.05] animate-in zoom-in-95 duration-500 overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-violet-600/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 -z-10" />

        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-violet-400 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.03]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-violet-500/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-zinc-100 tracking-tighter uppercase">
                Pridať Projekt
              </h2>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5 opacity-60">
                Accelerate your pipeline
              </p>
            </div>
          </div>
          <div className="flex bg-white/5 rounded-xl p-1 text-[9px] font-bold uppercase tracking-widest border border-white/5">
            <button
              onClick={() => setMode("form")}
              className={`px-3 py-1.5 rounded-lg transition-all ${mode === "form" ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Formulár
            </button>
            <button
              onClick={() => setMode("json")}
              className={`px-3 py-1.5 rounded-lg transition-all ${mode === "json" ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              RAW
            </button>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-3">
          {mode === "form" ? (
            <>
              <FormInput
                label="Názov projektu"
                value={formData.name}
                onChange={(v) => setFormData({ ...formData, name: v })}
                placeholder="REDIZAJN WEBU 2026"
                required
              />
              <FormSelect
                label="Typ projektu"
                value={formData.project_type}
                options={PROJECT_TYPES}
                onChange={(v) => setFormData({ ...formData, project_type: v })}
                list="project-types-list"
              />
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">
                  Kontakt z CRM
                </label>
                <input
                  required
                  list="contacts-list"
                  type="text"
                  className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-4 font-bold text-sm text-zinc-100 focus:border-violet-500/30 focus:bg-white/10 transition-all outline-none placeholder:text-zinc-700"
                  placeholder="Hľadať v kontaktoch..."
                  onChange={(e) => {
                    const selected = contacts.find(
                      (c) =>
                        `${c.first_name} ${c.last_name}` ===
                        e.target.value.split(" (")[0],
                    );
                    setFormData({
                      ...formData,
                      contact_id: selected ? selected.id.toString() : "",
                    });
                  }}
                />
                <datalist id="contacts-list">
                  {contacts.map((c) => (
                    <option
                      key={c.id}
                      value={`${c.first_name} ${c.last_name} (${c.company || "Osobné"})`}
                    />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">
                    Pipeline Stage
                  </label>
                  <select
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-4 font-bold text-sm text-zinc-100 focus:border-violet-500/30 focus:bg-white/10 outline-none transition-all"
                    value={formData.stage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stage: e.target.value as ProjectStage,
                      })
                    }
                  >
                    {PROJECT_STAGES.map((s) => (
                      <option key={s.value} value={s.value} className="bg-zinc-900">
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <FormInput
                  label="Deadline"
                  value={formData.end_date}
                  onChange={(v) => setFormData({ ...formData, end_date: v })}
                  type="date"
                />
              </div>
            </>
          ) : (
            <textarea
              className="w-full h-64 font-mono text-xs p-6 bg-white/5 border border-white/10 rounded-[2rem] text-zinc-300 focus:border-violet-500/30 focus:bg-white/10 outline-none resize-none shadow-inner placeholder:text-zinc-700 thin-scrollbar overflow-y-auto"
              placeholder="INSERT SYSTEM MEMORY..."
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
          )}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] h-10 bg-violet-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-xl shadow-violet-600/20 hover:bg-violet-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Vytvoriť Projekt"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface FormInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: FormInputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">
        {label}
      </label>
      {type === 'date' ? (
        <PremiumDatePicker 
          value={value} 
          onChange={onChange} 
          placeholder={placeholder} 
        />
      ) : (
        <input
          required={required}
          type={type}
          placeholder={placeholder}
          className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-4 font-bold text-sm text-zinc-100 focus:border-violet-500/30 focus:bg-white/10 transition-all outline-none placeholder:text-zinc-700"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

interface FormSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  list: string;
}

function FormSelect({
  label,
  value,
  options,
  onChange,
  list,
}: FormSelectProps) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">
        {label}
      </label>
      <input
        list={list}
        type="text"
        className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-4 font-bold text-sm text-zinc-100 placeholder:text-zinc-700 focus:border-violet-500/30 focus:bg-white/10 transition-all outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <datalist id={list}>
        {options.map((o: string) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  );
}
