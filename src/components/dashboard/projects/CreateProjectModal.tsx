"use client";

import * as React from "react";
import { X, Plus, Loader2 } from "lucide-react";
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
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl p-10 relative border border-gray-100 animate-in zoom-in-95 duration-500">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 p-2 text-gray-300 hover:text-gray-900 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100">
              <Plus className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">
                Pridať Projekt
              </h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 opacity-60">
                Accelerate your pipeline
              </p>
            </div>
          </div>
          <div className="flex bg-gray-100 rounded-xl p-1 text-[10px] font-black uppercase tracking-widest">
            <button
              onClick={() => setMode("form")}
              className={`px-3 py-1.5 rounded-lg transition-all ${mode === "form" ? "bg-white shadow text-indigo-600" : "text-gray-400 hover:text-gray-900"}`}
            >
              Formulár
            </button>
            <button
              onClick={() => setMode("json")}
              className={`px-3 py-1.5 rounded-lg transition-all ${mode === "json" ? "bg-white shadow text-indigo-600" : "text-gray-400 hover:text-gray-900"}`}
            >
              RAW
            </button>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          {mode === "form" ? (
            <>
              <FormInput
                label="Názov projektu"
                value={formData.name}
                onChange={(v) => setFormData({ ...formData, name: v })}
                placeholder="Redizajn webu 2026"
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
                <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                  Kontakt z CRM
                </label>
                <input
                  required
                  list="contacts-list"
                  type="text"
                  className="w-full h-14 bg-gray-50/50 border-2 border-indigo-50 dark:border-white/5 rounded-2xl px-5 font-bold text-sm focus:border-indigo-500 focus:bg-white transition-all outline-none"
                  placeholder="Začnite písať meno..."
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
                  <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                    Pipeline Stage
                  </label>
                  <select
                    className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 font-bold text-sm focus:border-indigo-500 focus:bg-white outline-none"
                    value={formData.stage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stage: e.target.value as ProjectStage,
                      })
                    }
                  >
                    {PROJECT_STAGES.map((s) => (
                      <option key={s.value} value={s.value}>
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
              className="w-full h-64 font-mono text-xs p-6 bg-gray-50 border-2 border-gray-100 rounded-[2rem] focus:border-indigo-500 focus:bg-white outline-none resize-none shadow-inner"
              placeholder="Insert system memory..."
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
          )}
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-14 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] h-14 bg-gray-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
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
      <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
        {label}
      </label>
      <input
        required={required}
        type={type}
        placeholder={placeholder}
        className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 font-bold text-sm focus:border-indigo-500 focus:bg-white transition-all outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
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
      <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
        {label}
      </label>
      <input
        list={list}
        type="text"
        className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 font-bold text-sm focus:border-indigo-500 focus:bg-white transition-all outline-none"
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
