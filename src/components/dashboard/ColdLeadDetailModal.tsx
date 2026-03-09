"use client";

import * as React from "react";
import { ColdLeadItem } from "@/app/actions/cold-leads";
import { X, Mail, MessageSquare, Phone, Globe, Building2, MapPin, Zap, Briefcase } from "lucide-react";
import { EmailComposerView } from "./contacts/EmailComposerView";
import { SmsQrView } from "./contacts/SmsQrView";
import { Lead } from "@/types/contact";

interface ColdLeadDetailModalProps {
  lead: ColdLeadItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ColdLeadDetailModal({
  lead,
  isOpen,
  onClose,
}: ColdLeadDetailModalProps) {
  const [emailMode, setEmailMode] = React.useState(false);
  const [smsMode, setSmsMode] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setEmailMode(false);
      setSmsMode(false);
    }
  }, [isOpen]);

  if (!isOpen || !lead) return null;

  const companyName = lead.company_name_reworked || lead.title || "Firma";

  // Map to Lead type for composer views
  const fakeLead: Lead = {
    id: typeof lead.id === 'string' ? (parseInt(lead.id.replace(/\D/g, '')) || 0) : lead.id,
    first_name: companyName,
    last_name: "",
    email: lead.email || "",
    phone: lead.phone || "",
    company: companyName,
    status: lead.status || "lead",
    website: lead.website || "",
  };

  const emailSubject = `AI audit pre ${companyName} – eliminácia manuálnej práce v statike`;
  
  // Convert newlines to <p> tags for the RichTextEditor
  const emailBodyHtml = `
<p>Dobrý deň, pán [Meno statika],</p>
<p>v nadväznosti na náš krátky hovor vám posielam sľúbené informácie o tom, ako pomáhame statickým ateliérom zefektívniť prácu (najmä v stupňoch realizačných projektov – 400).</p>
<p>Ako prebieha náš AI audit? Nezačíname nákupom drahého softvéru, ale analýzou vašich procesov:</p>
<ul>
    <li><strong>Mapovanie procesov:</strong> Pozrieme sa, kde vaši ľudia trávia najviac času (napr. ručné nahadzovanie zaťažení z architektonických PDF, manuálne spracovanie prestupov v BIM-e alebo písanie sprievodných správ k posudkom).</li>
    <li><strong>Identifikácia „úzkych hrdiel“:</strong> Určíme konkrétne miesta, kde AI dokáže prepojiť vaše výpočtové programy (SCIA, Dlubal, IDEA) s Revit modelom a dokumentáciou.</li>
    <li><strong>Výpočet návratnosti:</strong> Vyčíslime vám, koľko hodín mesačne dokáže ušetriť a aký nástroj (napr. vlastný asistent pre Eurokódy alebo automatizovaný extrakt dát) má pre vás najväčší zmysel.</li>
</ul>
<p>Výsledkom auditu je jasná mapa: menej času na administratíve = viac času na reálnu statiku a viac odovzdaných projektov.</p>
<p>Navrhujem krátky 15-minútový call, kde vám ukážem konkrétne príklady automatizácie z praxe.</p>
<p>Svoj termín si môžete vybrať priamo v mojom kalendári tu: 👉 <a href="https://calendly.com/andrej-arcigy/ai-konzultacia">https://calendly.com/andrej-arcigy/ai-konzultacia</a></p>
<p>Teším sa na prípadnú spoluprácu.</p>
<p>S pozdravom,</p>
<p><strong>Andrej Repický</strong><br/>+421919165630<br/><a href="https://arcigy.com/">https://arcigy.com/</a></p>
  `.trim();

  const smsTemplate = `Dobrý deň, pán [Meno], tu Andrej Repický z ArciGy. Posielal som Vám email ohľadom AI auditu pre ${companyName}. Nájdete si chvíľku?`;

  return (
    <div className="fixed inset-0 z-[270] flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-300">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="bg-background w-full max-w-[95vw] sm:max-w-4xl h-[85vh] sm:rounded-[3.5rem] shadow-2xl relative flex overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border border-border transition-colors">
        
        {/* Left Sidebar - Summary */}
        <div className="w-80 bg-slate-50 border-r border-border p-8 hidden md:flex flex-col gap-6 overflow-y-auto thin-scrollbar">
           <div className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-blue-200 uppercase shrink-0">
             {companyName[0]}
           </div>
           <div>
              <h2 className="text-xl font-black text-gray-900 leading-tight mb-1">{companyName}</h2>
              <p className="text-xs font-bold text-gray-400 flex items-center gap-1.5 uppercase tracking-wide">
                <Building2 className="w-3 h-3" />
                {lead.category || "Cold outreach lead"}
              </p>
           </div>

           <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                   <Mail className="w-3.5 h-3.5" />
                 </div>
                 <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase text-gray-400">Email</p>
                    <p className="text-xs font-bold truncate">{lead.email || "—"}</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                   <Phone className="w-3.5 h-3.5" />
                 </div>
                 <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase text-gray-400">Telefón</p>
                    <p className="text-xs font-bold truncate">{lead.phone || "—"}</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                   <MapPin className="w-3.5 h-3.5" />
                 </div>
                 <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase text-gray-400">Mesto</p>
                    <p className="text-xs font-bold truncate">{lead.city || "—"}</p>
                 </div>
              </div>
           </div>

            {lead.industry_description && (
              <div className="bg-slate-100 border border-gray-200 p-5 rounded-[1.8rem] mb-4">
                 <p className="text-[10px] font-black uppercase text-gray-500 mb-2 flex items-center gap-1.5">
                    <Briefcase className="w-3 h-3" />
                    Industry Identification
                 </p>
                 <p className="text-xs font-bold text-gray-700 leading-relaxed">
                    {lead.industry_description}
                 </p>
              </div>
            )}

           {lead.ai_first_sentence && (
             <div className="bg-blue-600/5 border border-blue-600/10 p-5 rounded-[1.8rem] mt-auto">
                <p className="text-[10px] font-black uppercase text-blue-600 mb-2 flex items-center gap-1.5">
                   <Zap className="w-3 h-3 fill-current" />
                   AI Intro
                </p>
                <p className="text-xs font-bold text-blue-900 italic leading-relaxed">
                   &quot;{lead.ai_first_sentence}&quot;
                </p>
             </div>
           )}
        </div>

        {/* Main Area */}
        <div className="flex-1 flex flex-col bg-white">
           <div className="h-16 border-b border-gray-100 flex items-center justify-between px-8 shrink-0">
              <div className="flex gap-6">
                 <button 
                  onClick={() => { setEmailMode(false); setSmsMode(false); }}
                  className={`text-sm font-black uppercase tracking-widest py-5 transition-all ${!emailMode && !smsMode ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-300 hover:text-gray-900 border-b-2 border-transparent"}`}
                 >
                    Možnosti
                 </button>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-gray-100 rounded-full text-gray-300 transition-all active:scale-95"
              >
                 <X className="w-5 h-5" />
              </button>
           </div>

           <div className="flex-1 overflow-y-auto thin-scrollbar relative">
              {emailMode ? (
                <div className="h-full">
                    <EmailComposerView 
                    contact={fakeLead} 
                    onClose={() => setEmailMode(false)} 
                    initialSubject={emailSubject}
                    initialBody={emailBodyHtml}
                    />
                </div>
              ) : smsMode ? (
                <SmsQrView 
                  contact={fakeLead} 
                  onClose={() => setSmsMode(false)} 
                  initialBody={smsTemplate}
                />
              ) : (
                <div className="p-12 flex flex-col items-center justify-center h-full gap-8 bg-slate-50/30">
                   <div className="text-center space-y-2">
                      <h3 className="text-3xl font-black text-gray-900 tracking-tight">Vyberte štýl oslovenia</h3>
                      <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Pripravené šablóny pre Andreja</p>
                   </div>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl px-4">
                      <button 
                         onClick={() => setEmailMode(true)}
                         className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-blue-100 hover:scale-[1.02] transition-all group text-left relative overflow-hidden"
                      >
                         <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform relative z-10">
                            <Mail className="w-8 h-8" />
                         </div>
                         <h4 className="font-black text-xl text-gray-900 mb-2 relative z-10">Poslať Email</h4>
                         <p className="text-xs text-gray-400 font-bold uppercase tracking-wider relative z-10">Editor s AI Audit šablónou</p>
                         <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/30 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-100/40 transition-all"></div>
                      </button>

                      <button 
                         onClick={() => setSmsMode(true)}
                         className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-emerald-100 hover:scale-[1.02] transition-all group text-left relative overflow-hidden"
                      >
                         <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform relative z-10">
                            <MessageSquare className="w-8 h-8" />
                         </div>
                         <h4 className="font-black text-xl text-gray-900 mb-2 relative z-10">Poslať SMS</h4>
                         <p className="text-xs text-gray-400 font-bold uppercase tracking-wider relative z-10">Vygenerovať QR kód</p>
                         <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/30 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-100/40 transition-all"></div>
                      </button>
                   </div>

                   <div className="flex items-center gap-12 mt-12 pt-12 border-t border-gray-100 w-full max-w-lg justify-center">
                      <div className="text-center group">
                         <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-2 group-hover:text-blue-400 transition-colors">Webová Stránka</p>
                         <a 
                            href={lead.website?.startsWith('http') ? lead.website : `https://${lead.website}`} 
                            target="_blank" 
                            className="text-xs font-black text-blue-600 hover:text-blue-700 flex items-center gap-2 justify-center bg-blue-50 px-4 py-2 rounded-xl transition-all hover:shadow-lg shadow-blue-100"
                         >
                            <Globe className="w-4 h-4" />
                            Prejsť na web
                         </a>
                      </div>
                      <div className="text-center group">
                         <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-2 group-hover:text-gray-600 transition-colors">Telefónne Číslo</p>
                         <a 
                            href={`tel:${lead.phone}`} 
                            className="text-xs font-black text-gray-900 flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl transition-all hover:bg-gray-100"
                         >
                            <Phone className="w-4 h-4" />
                            {lead.phone || "Nezadaný"}
                         </a>
                      </div>
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
