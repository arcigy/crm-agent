"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, FolderUp, Pencil, Sparkles, X } from "lucide-react";
import type { GmailAttachment, GmailMessage } from "@/types/gmail";

type Confidence = "high" | "medium" | "low";

type SelectedAttachment = GmailAttachment & { selected: boolean };

function formatSizeKB(bytes: number) {
  const kb = Math.max(0, bytes || 0) / 1024;
  return `${kb.toFixed(0)} KB`;
}

function sanitizeDrivePath(path: string) {
  const raw = (path || "").trim().replace(/^\/+/, "").replace(/\/+$/, "");
  const parts = raw
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 3);

  // Basic validation: disallow weird control chars and Drive query-problematic quotes
  const cleanedParts = parts.map((p) =>
    p
      .replace(/[\r\n\t]/g, " ")
      .replace(/[<>:"\\|?*]/g, "")
      .slice(0, 80),
  );

  return cleanedParts.join("/");
}

function getConfidenceMeta(confidence: Confidence) {
  switch (confidence) {
    case "high":
      return { label: "Vysoká zhoda", dot: "bg-emerald-500" };
    case "medium":
      return { label: "Stredná zhoda", dot: "bg-amber-500" };
    default:
      return { label: "Nízka zhoda — skontroluj cestu", dot: "bg-zinc-400" };
  }
}

export function SaveToDriveModal(props: {
  email: Pick<GmailMessage, "id" | "subject" | "from" | "date">;
  attachments: GmailAttachment[];
  onClose: () => void;
}) {
  const { email, attachments, onClose } = props;

  const [selectedAttachments, setSelectedAttachments] = React.useState<SelectedAttachment[]>(
    attachments.map((a) => ({ ...a, selected: true })),
  );
  const [description, setDescription] = React.useState("");
  const [suggestedPath, setSuggestedPath] = React.useState("");
  const [editedPath, setEditedPath] = React.useState("");
  const [reasoning, setReasoning] = React.useState("");
  const [confidence, setConfidence] = React.useState<Confidence>("low");
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isEditingPath, setIsEditingPath] = React.useState(false);

  const suggestAbortRef = React.useRef<AbortController | null>(null);

  const selected = React.useMemo(
    () => selectedAttachments.filter((a) => a.selected),
    [selectedAttachments],
  );

  const primaryForSuggestion = selected[0] || selectedAttachments[0];

  const confidenceMeta = getConfidenceMeta(confidence);

  async function handleSuggest() {
    if (!primaryForSuggestion) return;

    suggestAbortRef.current?.abort();
    const controller = new AbortController();
    suggestAbortRef.current = controller;

    setIsSuggesting(true);
    try {
      const res = await fetch("/api/google/drive/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          action: "suggest",
          filename: primaryForSuggestion.filename || email.subject || "file",
          mimeType: primaryForSuggestion.mimeType || "application/octet-stream",
          emailSubject: email.subject || "",
          emailFrom: email.from || "",
          emailFromName: (email.from || "").split("<")[0]?.replace(/"/g, "").trim() || "",
          description,
        }),
      });

      const data = await res.json();
      const path = sanitizeDrivePath(data?.suggestedPath || "");

      setSuggestedPath(path);
      setEditedPath(path);
      setReasoning(data?.reasoning || "");
      setConfidence(data?.confidence === "high" || data?.confidence === "medium" ? data.confidence : "low");
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error(e);
        toast.error("AI návrh cesty zlyhal");
      }
    } finally {
      setIsSuggesting(false);
    }
  }

  async function handleSave() {
    const filesToSave = selectedAttachments.filter((a) => a.selected);
    if (filesToSave.length === 0) {
      toast.error("Vyber aspoň jednu prílohu");
      return;
    }

    const finalPath = sanitizeDrivePath(editedPath || suggestedPath);
    if (!finalPath) {
      toast.error("Zadaj cestu v Drive");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Ukladám do Google Drive...");

    try {
      const results: Array<{ fileUrl?: string; success?: boolean; error?: string }> = [];

      for (const att of filesToSave) {
        const res = await fetch("/api/google/drive/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save",
            gmailMessageId: email.id,
            attachmentId: att.id,
            filename: att.filename,
            mimeType: att.mimeType,
            drivePath: finalPath,
            description,
          }),
        });
        const data = await res.json();
        results.push(data);

        if (!data?.success) {
          throw new Error(data?.error || "Upload failed");
        }
      }

      const firstUrl = results.find((r) => r?.fileUrl)?.fileUrl;
      toast.success("Uložené do Google Drive", { id: toastId });

      if (firstUrl) {
        toast.message("Otvoriť v Drive", {
          description: (
            <a
              href={firstUrl}
              target="_blank"
              rel="noreferrer"
              className="text-violet-600 hover:text-violet-700 font-bold underline"
            >
              {firstUrl}
            </a>
          ),
        });
      }

      onClose();
    } catch (e: any) {
      toast.error(`Ukladanie zlyhalo: ${e?.message || e}`, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  }

  // Auto-suggest on open
  React.useEffect(() => {
    handleSuggest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced auto-suggest when description changes
  React.useEffect(() => {
    if (!primaryForSuggestion) return;
    const t = setTimeout(() => handleSuggest(), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description]);

  const toggleAttachment = (id: string) => {
    setSelectedAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a)),
    );
  };

  return (
    <div className="fixed inset-0 z-[220] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-violet-100 dark:border-white/10 overflow-hidden">
        <div className="px-6 py-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-violet-50/50 dark:bg-violet-900/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
              <FolderUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-violet-950 dark:text-violet-100 uppercase tracking-tight">
                Uložiť do súborov
              </h3>
              <p className="text-[11px] font-bold text-violet-500 uppercase tracking-widest leading-none mt-1">
                Google Drive • automatický návrh cesty
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all text-zinc-500"
            title="Zavrieť"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-black text-violet-700 dark:text-violet-400 uppercase tracking-widest">
                Prílohy
              </p>
              <p className="text-[11px] font-bold text-zinc-500">
                {selected.length}/{attachments.length} vybrané
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedAttachments.map((att) => (
                <button
                  key={att.id}
                  onClick={() => toggleAttachment(att.id)}
                  className={[
                    "px-3 py-2 rounded-2xl border text-left transition-all flex items-center gap-2",
                    att.selected
                      ? "bg-violet-50 border-violet-200 text-violet-800"
                      : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50",
                  ].join(" ")}
                  title={att.filename}
                >
                  <span
                    className={[
                      "w-5 h-5 rounded-lg flex items-center justify-center border",
                      att.selected ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-zinc-200",
                    ].join(" ")}
                  >
                    {att.selected ? <Check className="w-3.5 h-3.5" /> : null}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-black truncate max-w-[300px]">{att.filename}</p>
                    <p className="text-[10px] font-bold opacity-70">{formatSizeKB(att.size)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-violet-700 dark:text-violet-400 uppercase tracking-widest mb-2">
              Popis
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[90px] px-4 py-3 bg-white dark:bg-black border border-violet-200 dark:border-violet-900/50 rounded-2xl text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all placeholder:font-medium placeholder:opacity-50"
              placeholder='napr. "Faktúra za opravu auta od ..."'
            />
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={handleSuggest}
                disabled={isSuggesting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-50 border border-violet-200 text-violet-700 font-black text-[11px] uppercase tracking-[0.1em] hover:bg-violet-100 transition-all disabled:opacity-60"
              >
                <Sparkles className="w-4 h-4" />
                {isSuggesting ? "Navrhujem..." : "Navrhnúť cestu"}
              </button>

              <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-500">
                <span className={`w-2 h-2 rounded-full ${confidenceMeta.dot}`} />
                <span>{confidenceMeta.label}</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-black/20 border border-zinc-200/60 dark:border-white/10 rounded-3xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                  Cesta v Drive
                </p>

                {!isEditingPath ? (
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-black text-zinc-900 dark:text-zinc-100 truncate">
                      {editedPath || suggestedPath || "—"}
                    </p>
                    <button
                      onClick={() => setIsEditingPath(true)}
                      className="p-2 rounded-xl hover:bg-white/70 dark:hover:bg-white/10 transition-all text-zinc-500"
                      title="Upraviť cestu"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      value={editedPath}
                      onChange={(e) => setEditedPath(sanitizeDrivePath(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-black border border-zinc-200 dark:border-white/10 rounded-xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                      placeholder="Faktúry/2026/Marec"
                      autoFocus
                    />
                    <button
                      onClick={() => setIsEditingPath(false)}
                      className="p-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-all"
                      title="Hotovo"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 text-[11px] font-black text-zinc-600 dark:text-zinc-300">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  AI návrh
                </span>
              </div>
            </div>

            {reasoning ? (
              <div className="mt-4 text-[12px] font-bold text-zinc-600 dark:text-zinc-300 leading-relaxed">
                <span className="text-zinc-400 font-black uppercase tracking-widest text-[10px] mr-2">
                  Dôvod
                </span>
                {reasoning}
              </div>
            ) : null}
          </div>
        </div>

        <div className="px-6 py-4 bg-violet-50/50 dark:bg-black/20 flex justify-end gap-3 border-t border-black/5 dark:border-white/10">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl text-zinc-500 dark:text-zinc-400 font-black text-[11px] uppercase tracking-[0.1em] hover:bg-white dark:hover:bg-zinc-800 transition-all disabled:opacity-60"
          >
            Zrušiť
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-2.5 rounded-xl bg-violet-600 text-white font-black text-[11px] uppercase tracking-[0.15em] hover:bg-violet-700 shadow-lg shadow-violet-600/30 transition-all active:scale-95 disabled:opacity-60 inline-flex items-center gap-2"
          >
            <FolderUp className="w-4 h-4" />
            {isSaving ? "Ukladám..." : "Uložiť"}
          </button>
        </div>
      </div>
    </div>
  );
}

