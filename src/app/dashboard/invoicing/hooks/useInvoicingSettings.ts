"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import directus from "@/lib/directus";
import { readItems, updateItem, createItem } from "@directus/sdk";
import { useCurrentCRMUser } from "@/hooks/useCurrentCRMUser";
import { InvoicingSettings } from "../types";

export function useInvoicingSettings() {
  const { user, isLoaded } = useCurrentCRMUser();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<InvoicingSettings>({
    companyName: "",
    ico: "",
    dic: "",
    icDph: "",
    address: "",
    bankAccount: "",
    email: "",
    phone: "",
    invoicePrefix: "FV",
    invoiceFooter: "Ďakujeme za prejavenú dôveru.",
    isVatPayer: false,
    primaryColor: "#8b5cf6"
  });

  useEffect(() => {
    async function fetchSettings() {
      if (!user?.emailAddresses?.[0]?.emailAddress) {
        if (isLoaded) setIsLoading(false);
        return;
      }
      
      try {
        const response = await directus.request(
          readItems("crm_invoicing_settings" as any, {
            filter: { user_email: { _eq: user.emailAddresses[0].emailAddress.toLowerCase() } },
            limit: 1
          })
        ) as any[];

        if (response && response.length > 0) {
          setSettings(response[0]);
        }
      } catch (error) {
        console.error("Failed to fetch invoicing settings:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, [user, isLoaded]);

  const handleSave = async () => {
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      toast.error("Používateľ nie je prihlásený");
      return;
    }

    setIsSaving(true);
    try {
      const userEmail = user.emailAddresses[0].emailAddress.toLowerCase();
      
      const existing = await directus.request(
        readItems("crm_invoicing_settings" as any, {
          filter: { user_email: { _eq: userEmail } },
          limit: 1
        })
      ) as any[];

      if (existing && existing.length > 0) {
        await directus.request(
          updateItem("crm_invoicing_settings" as any, existing[0].id, {
            ...settings,
            user_email: userEmail
          })
        );
      } else {
        await directus.request(
          createItem("crm_invoicing_settings" as any, {
            ...settings,
            user_email: userEmail
          })
        );
      }
      
      toast.success("Nastavenia fakturácie boli uložené");
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Nepodarilo sa uložiť nastavenia");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof InvoicingSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return {
    settings,
    isLoading,
    isSaving,
    handleSave,
    updateSetting
  };
}
