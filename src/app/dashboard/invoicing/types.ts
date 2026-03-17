export interface InvoicingSettings {
  id?: number;
  companyName: string;
  ico: string;
  dic: string;
  icDph: string;
  address: string;
  bankAccount: string;
  email: string;
  phone: string;
  invoicePrefix: string;
  invoiceFooter: string;
  isVatPayer: boolean;
  primaryColor: string;
  user_email?: string;
}
