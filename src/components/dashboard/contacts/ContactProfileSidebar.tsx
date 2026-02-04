"use client";

import * as React from "react";
import {
  Mail,
  Phone,
  Building2,
  MapPin,
  Globe,
  Briefcase,
  MessageSquare,
  Edit2,
  Check,
  ShieldCheck,
  Trash2,
  X,
  Cake,
  Gift,
} from "lucide-react";
import { Lead } from "@/types/contact";
import { QRCodeSVG } from "qrcode.react";
import { updateContact, deleteContact } from "@/app/actions/contacts";
import { toast } from "sonner";
import { getNameDayDate, formatSlovakDate } from "@/lib/calendar";
import { normalizeSlovakPhone } from "@/lib/phone";

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
  });

  const initials =
    (formData.first_name?.[0] || "") + (formData.last_name?.[0] || "");

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
    <div
      className={`w-80 lg:w-96 bg-sidebar border-r border-border flex flex-col shrink-0 overflow-y-auto transition-all duration-300 ${emailMode ? "hidden lg:flex w-64 opacity-50 pointer-events-none" : ""}`}
    >
      <div className="h-32 bg-gradient-to-br from-slate-800 to-slate-900 relative">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full sm:hidden"
        >
          <X className="w-5 h-5" />
        </button>
        <button
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          disabled={isSaving}
          className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md border border-white/20 transition-all active:scale-95"
          title={isEditing ? "Save" : "Edit Details"}
        >
          {isEditing ? (
            <Check className="w-4 h-4" />
          ) : (
            <Edit2 className="w-4 h-4" />
          )}
        </button>
        {isEditing && (
          <button
            onClick={() => setIsEditing(false)}
            className="absolute top-4 right-14 p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md border border-white/20 transition-all active:scale-95"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-6 relative">
        <div className="-mt-12 mb-4 w-24 h-24 rounded-3xl bg-card p-1.5 shadow-xl transition-colors">
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-3xl">
            {initials.toUpperCase()}
          </div>
        </div>

        <div className="mb-6">
          {isEditing ? (
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                type="text"
                value={formData.first_name}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-border rounded-lg p-2 text-sm font-bold placeholder:text-gray-400"
                placeholder="First Name"
              />
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-border rounded-lg p-2 text-sm font-bold placeholder:text-gray-400"
                placeholder="Last Name"
              />
            </div>
          ) : (
            <h2 className="text-2xl font-bold text-foreground leading-tight mb-1">
              {formData.first_name} {formData.last_name}
            </h2>
          )}
          
          {isEditing ? (
            <input
              type="text"
              value={formData.company}
              onChange={(e) =>
                setFormData({ ...formData, company: e.target.value })
              }
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-border rounded-lg p-2 text-xs font-medium placeholder:text-gray-400"
              placeholder="Company Name"
            />
          ) : (
            <p className="text-sm font-medium text-gray-500 flex items-center gap-1.5 transition-all">
              <Building2 className="w-3.5 h-3.5" />
              {formData.company || "Private Contact"}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8 relative">
          <div className="relative group/call">
            <button
              onClick={() => setShowQr(!showQr)}
              className="w-full flex items-center justify-center gap-2 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all active:scale-95"
            >
              <Phone className="w-4 h-4" />{" "}
              <span className="text-xs font-bold">Call</span>
            </button>
            {showQr && contact.phone && (
              <div className="absolute top-full left-0 mt-2 z-50 bg-card p-4 rounded-xl shadow-2xl border border-border animate-in fade-in zoom-in duration-200 w-48 flex flex-col items-center transition-colors">
                <div className="bg-white p-2 rounded-lg border border-gray-100 mb-2">
                  <QRCodeSVG value={`tel:${contact.phone}`} size={120} />
                </div>
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Scan to Call
                </p>
                <p className="text-xs font-black text-foreground">
                  {contact.phone}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => setEmailMode(true)}
            className="flex items-center justify-center gap-2 p-2.5 bg-card border border-border hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground rounded-xl shadow-sm transition-colors"
          >
            <Mail className="w-4 h-4" />{" "}
            <span className="text-xs font-bold">Email</span>
          </button>
          <button
            onClick={() => setSmsMode(true)}
            className="col-span-2 flex items-center justify-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl shadow-sm transition-all"
          >
            <MessageSquare className="w-4 h-4" />{" "}
            <span className="text-xs font-bold">Draft SMS to QR</span>
          </button>
        </div>

        <div className="space-y-4 mb-8">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Information
          </h3>
          <InfoRow
            icon={<Mail />}
            label="Email"
            value={formData.email}
            isEditing={isEditing}
            onChange={(val: string) => setFormData({ ...formData, email: val })}
            onSave={handleSave}
            copyable
          />
          <InfoRow
            icon={<Phone />}
            label="Phone"
            value={formData.phone}
            isEditing={isEditing}
            onChange={(val: string) => setFormData({ ...formData, phone: val })}
            onSave={handleSave}
            copyable
          />
          <InfoRow
            icon={<ShieldCheck />}
            label="Status"
            value={formData.status}
            isEditing={isEditing}
            isSelect
            options={[
              { label: "Lead", value: "lead" },
              { label: "Active", value: "active" },
              { label: "Archived", value: "archived" },
            ]}
            onChange={(val: string) => setFormData({ ...formData, status: val })}
            onSave={handleSave}
          />
          <InfoRow icon={<Briefcase />} label="Role" value="CEO / Owner" />
          <InfoRow icon={<MapPin />} label="Location" value="Slovakia" />
          <InfoRow
            icon={<Globe />}
            label="Website"
            value="www.example.com"
            valueClass="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          />
          <div className="pt-2">
            <InfoRow
              icon={<Gift />}
              label="Meniny"
              value={formatSlovakDate(formData.nameday || getNameDayDate(formData.first_name)) || "—"}
              isEditing={isEditing}
              onChange={(val: string) => setFormData({ ...formData, nameday: val })}
              onSave={handleSave}
            />
          </div>
          <InfoRow
            icon={<Cake />}
            label="Narodeniny"
            value={formatSlovakDate(formData.birthday) || formData.birthday}
            isEditing={isEditing}
            onChange={(val: string) => setFormData({ ...formData, birthday: val })}
            onSave={handleSave}
            placeholder="Napr. 15. Jún"
          />
        </div>

        <div className="pt-6 border-t border-border mt-auto mb-8">
          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all font-bold text-xs"
          >
            <Trash2 className="w-4 h-4" />
            Delete Contact
          </button>
        </div>
      </div>
    </div>
  );
}

interface InfoRowProps {
  icon: React.ReactElement;
  label: string;
  value?: string;
  copyable?: boolean;
  valueClass?: string;
  isEditing?: boolean;
  isSelect?: boolean;
  options?: { label: string; value: string }[];
  onChange?: (val: string) => void;
  onSave?: () => void;
  placeholder?: string;
}

function InfoRow({
  icon,
  label,
  value,
  copyable,
  valueClass,
  isEditing,
  isSelect,
  options,
  onChange,
  onSave,
  ...props
}: InfoRowProps) {
  return (
    <div className="flex items-center gap-3 group">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 bg-card border border-border shadow-sm shrink-0 transition-colors">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-3.5 h-3.5" })}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
          {label}
        </p>
        {isEditing && onChange ? (
          isSelect ? (
            <select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full bg-transparent border-none p-0 text-xs font-semibold text-foreground focus:ring-0 outline-none cursor-pointer"
            >
              {(options || []).map((opt: any) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && onSave) {
                  onSave();
                }
              }}
              className="w-full bg-transparent border-none p-0 text-xs font-semibold text-foreground focus:ring-0 outline-none"
              placeholder={props.placeholder || `Enter ${label}...`}
            />
          )
        ) : (
          <p
            className={`text-xs font-semibold text-foreground truncate ${valueClass || ""}`}
          >
            {value || "—"}
          </p>
        )}
      </div>
      {copyable && value && (
        <button
          onClick={() => navigator.clipboard.writeText(value)}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-xs text-gray-400 hover:text-foreground transition-all"
        >
          Copy
        </button>
      )}
    </div>
  );
}
