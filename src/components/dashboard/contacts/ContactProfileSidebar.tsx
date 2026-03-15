"use client";

import * as React from "react";
import {
  Mail,
  Phone,
  Building2,
  MapPin,
  Globe,
  Briefcase,
  ShieldCheck,
  Trash2,
  X,
  Cake,
  Gift,
  Check,
  Edit2,
  MessageSquare,
} from "lucide-react";
import { Lead } from "@/types/contact";
import { QRCodeSVG } from "qrcode.react";
import { updateContact, deleteContact } from "@/app/actions/contacts";
import { toast } from "sonner";
import { getNameDayDate, formatSlovakDate } from "@/lib/calendar";
import { normalizeSlovakPhone } from "@/lib/phone";
import { useRouter } from "next/navigation";

interface ContactProfileSidebarProps {
  contact: Lead;
  onClose: () => void;
  setEmailMode: (m: boolean) => void;
  setSmsMode: (m: boolean) => void;
  emailMode: boolean;
}

export function ContactProfileSidebar({
  contact,
  onClose,
  setEmailMode,
  setSmsMode,
  emailMode,
}: ContactProfileSidebarProps) {
  const router = useRouter();
  const [showQr, setShowQr] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formData, setFormData] = React.useState({
    first_name: contact.first_name || "",
    last_name: contact.last_name || "",
    email: contact.email || "",
    phone: contact.phone || "",
    company: contact.company || "",
    status: contact.status || "lead",
    birthday: contact.birthday || "",
    nameday: contact.nameday || "",
    job_title: contact.job_title || "",
    address: contact.address || "",
    website: contact.website || "",
  });

  const initials =
    (formData.first_name?.[0] || "") + (formData.last_name?.[0] || "");

  React.useEffect(() => {
    if (!isEditing) {
      setFormData({
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        email: contact.email || "",
        phone: contact.phone || "",
        company: contact.company || "",
        status: contact.status || "lead",
        birthday: contact.birthday || "",
        nameday: contact.nameday || "",
        job_title: contact.job_title || "",
        address: contact.address || "",
        website: contact.website || "",
      });
    }
  }, [contact, isEditing]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const normalizedFormData = {
        ...formData,
        phone: normalizeSlovakPhone(formData.phone)
      };
      const res = await updateContact(contact.id, normalizedFormData);
      if (res.success) {
        toast.success("Kontakt bol aktualizovaný");
        setIsEditing(false);
      } else {
        toast.error(res.error || "Chyba pri ukladaní");
      }
    } catch {
      toast.error("Nepodarilo sa uložiť zmeny");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Naozaj chcete zmazať tento kontakt?")) return;
    try {
      const res = await deleteContact(contact.id);
      if (res.success) {
        toast.success("Kontakt bol zmazaný");
        onClose();
      } else {
        toast.error(res.error || "Chyba pri mazaní");
      }
    } catch {
      toast.error("Nepodarilo sa zmazať kontakt");
    }
  };

  return (
    <div className={`w-80 lg:w-96 bg-slate-950 border-r border-white/5 flex flex-col shrink-0 overflow-y-auto thin-scrollbar select-none relative transition-all duration-300 ${emailMode ? "opacity-50 pointer-events-none" : ""}`}>
      
      {/* Minimalistic Header */}
      <div className="pt-12 px-10 pb-10 border-b border-white/5 relative">
         <div className="absolute top-6 right-6 flex gap-2 z-20">
             <button
                onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                disabled={isSaving}
                className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all active:scale-95"
             >
                {isEditing ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4 text-white/40" />}
             </button>
             {isEditing && (
                 <button onClick={() => setIsEditing(false)} className="p-2.5 bg-white/5 hover:bg-red-500/10 text-red-500 rounded-xl border border-white/10 transition-all">
                     <X className="w-4 h-4" />
                 </button>
             )}
         </div>

         <div className="flex flex-col items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-violet-600 flex items-center justify-center text-white font-bold text-xl shadow-[0_0_30px_rgba(139,92,246,0.15)] shrink-0 border border-white/10">
                {initials.toUpperCase()}
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white leading-tight">
                    {formData.first_name} {formData.last_name}
                </h2>
                <p className="text-xs font-semibold text-violet-400 mt-1">Súkromný kontakt</p>
            </div>
         </div>
      </div>

      <div className="flex-1 px-8 pt-10 space-y-10">
        {/* Core Actions - Clean PWA style */}
        <div className="grid grid-cols-2 gap-3">
            <div className="relative group">
                <button
                    onClick={() => setShowQr(!showQr)}
                    className="w-full h-10 flex items-center justify-center gap-2 bg-violet-600 text-white rounded-xl font-semibold text-xs transition-all active:scale-95 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                >
                    <Phone className="w-4 h-4" /> Zavolať
                </button>
                {showQr && (
                    <div className="fixed bottom-10 left-10 z-[300] bg-slate-900/95 backdrop-blur-3xl border border-violet-500/30 p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center animate-in slide-in-from-bottom-5 duration-300">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowQr(false); }} 
                            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-800 border border-violet-500/30 flex items-center justify-center text-white hover:bg-violet-600 transition-colors shadow-lg z-10"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="bg-white p-3 rounded-2xl mb-3 shadow-inner">
                            <QRCodeSVG value={`tel:${formData.phone}`} size={140} />
                        </div>
                        <p className="text-[13px] font-bold text-white tracking-wide flex items-center justify-center gap-2">
                           <Phone className="w-3.5 h-3.5 text-violet-400" /> {formData.phone || "Bez čísla"}
                        </p>
                    </div>
                )}
            </div>
            <button
                onClick={() => {
                    const email = formData.email || "";
                    if (!email) {
                        toast.error("Kontakt nemá priradený e-mail");
                        return;
                    }
                    onClose();
                    router.push(`/dashboard/leads?compose=${encodeURIComponent(email)}`);
                }}
                onMouseEnter={() => {
                    const email = formData.email || "";
                    if (email) {
                        router.prefetch(`/dashboard/leads?compose=${encodeURIComponent(email)}`);
                    }
                }}
                className="h-10 flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white rounded-xl font-semibold text-xs transition-all hover:bg-white/10 active:scale-95 px-4"
            >
                <Mail className="w-4 h-4" /> Email
            </button>
        </div>

        {/* Info Grid - Minimalistic List */}
        <div className="space-y-4">
            <ContactInfoRow 
                icon={<Mail />} 
                label="Email" 
                value={formData.email} 
                isEditing={isEditing}
                onChange={(v: string) => setFormData({...formData, email: v})}
                onClick={() => {
                    const email = formData.email || "";
                    if (!email) {
                        toast.error("Kontakt nemá priradený e-mail");
                        return;
                    }
                    onClose();
                    router.push(`/dashboard/leads?compose=${encodeURIComponent(email)}`);
                }}
            />
            <ContactInfoRow 
                icon={<Phone />} 
                label="Telefón" 
                value={formData.phone} 
                isEditing={isEditing}
                onChange={(v: string) => setFormData({...formData, phone: v})}
            />
            <ContactInfoRow 
                icon={<ShieldCheck />} 
                label="Status" 
                value={formData.status} 
                color={formData.status === 'active' ? 'text-emerald-400' : formData.status === 'lead' ? 'text-blue-400' : 'text-zinc-500'}
                isEditing={isEditing}
                isSelect
                options={[
                    { label: "Lead", value: "lead" },
                    { label: "Active", value: "active" },
                    { label: "Archived", value: "archived" },
                ]}
                onChange={(v: string) => setFormData({...formData, status: v})}
            />
            <ContactInfoRow 
                icon={<Briefcase />} 
                label="Pozícia" 
                value={formData.job_title} 
                isEditing={isEditing}
                onChange={(v: string) => setFormData({...formData, job_title: v})}
            />
            <ContactInfoRow 
                icon={<Building2 />} 
                label="Firma" 
                value={formData.company} 
                isEditing={isEditing}
                onChange={(v: string) => setFormData({...formData, company: v})}
            />
            <ContactInfoRow 
                icon={<MapPin />} 
                label="Lokalita" 
                value={formData.address} 
                isEditing={isEditing}
                onChange={(v: string) => setFormData({...formData, address: v})}
            />
            <ContactInfoRow 
                icon={<Globe />} 
                label="Webstránka" 
                value={formData.website} 
                isEditing={isEditing}
                onChange={(v: string) => setFormData({...formData, website: v})}
            />
            <ContactInfoRow 
                icon={<Gift />} 
                label="Meniny" 
                value={formatSlovakDate(formData.nameday || getNameDayDate(formData.first_name)) || "—"} 
                isEditing={isEditing}
                onChange={(v: string) => setFormData({...formData, nameday: v})}
            />
            <ContactInfoRow 
                icon={<Cake />} 
                label="Narodeniny" 
                value={formatSlovakDate(formData.birthday) || formData.birthday || "—"} 
                isEditing={isEditing}
                renderEdit={() => (
                    <BirthdayPicker 
                        value={formData.birthday} 
                        onChange={(val) => setFormData({ ...formData, birthday: val })} 
                    />
                )}
            />
        </div>

        {/* Delete Action - Clean Footer */}
        <div className="pt-8 pb-20 border-t border-white/5 opacity-50 hover:opacity-100 transition-opacity">
            <button
                onClick={handleDelete}
                className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-red-500/80 hover:text-red-500 transition-all active:scale-95"
            >
                Zmazať kontakt
            </button>
        </div>
      </div>
    </div>
  );
}

function ContactInfoRow({ icon, label, value, color, isEditing, onChange, isSelect, options, renderEdit, onClick }: any) {
    return (
        <div 
            className={`group flex items-center justify-between py-1 transition-all relative ${onClick && !isEditing ? "cursor-pointer" : ""}`}
            onClick={() => !isEditing && onClick?.()}
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-xl bg-violet-500/5 flex items-center justify-center text-violet-400/50 transition-colors group-hover:text-violet-400 group-hover:bg-violet-500/10 shrink-0">
                    {React.cloneElement(icon as React.ReactElement, { className: "w-3.5 h-3.5" } as any)}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[10px] font-semibold text-zinc-500 mb-0.5">{label}</span>
                    {isEditing ? (
                        renderEdit ? renderEdit() : isSelect ? (
                            <select 
                                value={value} 
                                onChange={(e) => onChange(e.target.value)}
                                className="bg-transparent border-b border-violet-500/30 p-0 pb-1 text-sm font-medium text-white focus:ring-0 outline-none cursor-pointer"
                            >
                                {options.map((o: any) => <option key={o.value} value={o.value} className="bg-zinc-900">{o.label}</option>)}
                            </select>
                        ) : (
                            <input 
                                type="text"
                                value={value || ""}
                                onChange={(e) => onChange(e.target.value)}
                                className="bg-transparent border-b border-violet-500/30 p-0 pb-1 text-sm font-medium text-white focus:ring-0 outline-none w-full"
                            />
                        )
                    ) : (
                        <p className={`text-sm font-medium ${color || "text-zinc-200"} transition-colors truncate pr-4`}>
                            {value || "—"}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

function BirthdayPicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const dateObj = value && value.includes('-') ? new Date(value) : null;
  const [d, setD] = React.useState(dateObj ? dateObj.getDate().toString() : "");
  const [m, setM] = React.useState(dateObj ? (dateObj.getMonth() + 1).toString() : "");
  const [y, setY] = React.useState(dateObj ? dateObj.getFullYear().toString() : "");

  React.useEffect(() => {
    if (d && m && y) {
      const pad = (n: string) => n.padStart(2, '0');
      onChange(`${y}-${pad(m)}-${pad(d)}`);
    } else if (!d && !m && !y) {
      onChange("");
    }
  }, [d, m, y, onChange]);

  return (
    <div className="flex items-center gap-1.5 mt-2">
      <div className="relative group/bday-select w-1/4">
          <select value={d} onChange={(e) => setD(e.target.value)} className="w-full appearance-none bg-black/40 border border-white/10 rounded-lg py-1.5 px-2.5 text-xs text-white/90 font-bold focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all cursor-pointer hover:border-white/20">
            <option value="" className="text-zinc-500">Deň</option>
            {Array.from({length: 31}, (_, i) => i + 1).map(day => <option key={day} value={day} className="bg-zinc-900">{day}.</option>)}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/30 group-hover/bday-select:text-violet-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
      </div>
      <div className="relative group/bday-select w-1/3">
          <select value={m} onChange={(e) => setM(e.target.value)} className="w-full appearance-none bg-black/40 border border-white/10 rounded-lg py-1.5 px-2.5 text-xs text-white/90 font-bold focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all cursor-pointer hover:border-white/20">
            <option value="" className="text-zinc-500">Mes.</option>
            {Array.from({length: 12}, (_, i) => i + 1).map(month => <option key={month} value={month} className="bg-zinc-900">{month}.</option>)}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/30 group-hover/bday-select:text-violet-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
      </div>
      <div className="relative group/bday-select flex-1">
          <select value={y} onChange={(e) => setY(e.target.value)} className="w-full appearance-none bg-black/40 border border-white/10 rounded-lg py-1.5 px-2.5 text-xs text-white/90 font-bold focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all cursor-pointer hover:border-white/20">
            <option value="" className="text-zinc-500">Rok</option>
            {Array.from({length: 100}, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y} className="bg-zinc-900">{y}</option>)}
          </select>
           <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/30 group-hover/bday-select:text-violet-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
      </div>
    </div>
  );
}
