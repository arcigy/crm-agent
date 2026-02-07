"use client";

import * as React from "react";
import { X, Send, AlertCircle, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { fetchSmartLeadCampaigns, addLeadsToSmartLeadCampaign } from "@/app/actions/smartlead";
import { Lead } from "@/types/contact";
import { SmartLeadCampaign } from "@/types/smartlead";

interface AddToSmartLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContacts: Lead[];
  onSuccess: () => void;
}

export function AddToSmartLeadModal({
  isOpen,
  onClose,
  selectedContacts,
  onSuccess,
}: AddToSmartLeadModalProps) {
  const [campaigns, setCampaigns] = React.useState<SmartLeadCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [fetchingCampaigns, setFetchingCampaigns] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      loadCampaigns();
    }
  }, [isOpen]);

  const loadCampaigns = async () => {
    setFetchingCampaigns(true);
    setError(null);
    const res = await fetchSmartLeadCampaigns();
    if (res.success && res.data) {
      setCampaigns(res.data);
    } else {
      setError(res.error || "Nepodarilo sa načítať kampane zo SmartLead.");
    }
    setFetchingCampaigns(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId) return;

    setLoading(true);
    try {
      // Prepare leads payload
      const leadsToAdd = selectedContacts.map(contact => ({
        email: contact.email,
        first_name: contact.first_name,
        last_name: contact.last_name,
        company_name: contact.company,
        website: contact.website,
        custom_fields: {
            PHONE: contact.phone || ""
        }
      })).filter(l => l.email); // Ensure email exists

      if (leadsToAdd.length === 0) {
        toast.error("Žiadny z vybraných kontaktov nemá email.");
        setLoading(false);
        return;
      }

      const res = await addLeadsToSmartLeadCampaign(selectedCampaignId, leadsToAdd);
      
      if (res.success) {
        toast.success(`Úspešne pridaných ${leadsToAdd.length} leadov do kampane.`);
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || "Chyba pri pridávaní leadov.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Neočakávaná chyba.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-lg rounded-[3rem] border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
        <div className="bg-black p-8 text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-purple-500">SmartLead Import</h2>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">
              {selectedContacts.length} KONTAKTOV • KAMPANE
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded-r-2xl flex gap-3 text-purple-800 mb-4">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-xs font-bold leading-relaxed">
              Vyberte kampaň, do ktorej chcete pridať označené kontakty. Kontakty bez emailu budú preskočené.
            </p>
          </div>

          <div className="space-y-4">
            {error && (
                <div className="p-3 bg-red-100 text-red-600 text-xs font-bold rounded-xl border border-red-200">
                    {error}
                </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase italic tracking-widest text-muted-foreground mb-3">Vyberte Kampaň</label>
              
              {fetchingCampaigns ? (
                  <div className="flex justify-center p-8">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                  </div>
              ) : (
                  <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {campaigns.length === 0 && !error && (
                          <p className="text-sm text-center text-muted-foreground py-4">Žiadne kampane nenájdené.</p>
                      )}
                      
                      {campaigns.map(campaign => (
                          <div 
                            key={campaign.id}
                            onClick={() => setSelectedCampaignId(campaign.id)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                selectedCampaignId === campaign.id 
                                ? "bg-purple-50 border-purple-500 ring-1 ring-purple-500" 
                                : "bg-muted/20 border-border hover:border-purple-300 hover:bg-muted/40"
                            }`}
                          >
                              <div>
                                  <div className="font-bold text-sm text-foreground">{campaign.name}</div>
                                  <div className="text-[10px] uppercase font-bold text-muted-foreground mt-1 flex items-center gap-2">
                                      <span className={`w-2 h-2 rounded-full ${campaign.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                      {campaign.status}
                                  </div>
                              </div>
                              {selectedCampaignId === campaign.id && (
                                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white">
                                      <Check className="w-4 h-4" />
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-8 py-4 bg-muted text-foreground rounded-2xl font-black uppercase italic tracking-widest hover:bg-muted/80 transition-all"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={loading || !selectedCampaignId}
              className="flex-[2] px-8 py-4 bg-purple-600 text-white rounded-2xl font-black uppercase italic tracking-widest hover:bg-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Spracovávam..." : <><Send className="w-5 h-5" /> Importovať do SmartLead</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
