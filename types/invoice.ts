export interface Invoice {
  id: string;
  trainer_id: string;
  client_id: string;
  pricing_package_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  due_date: string;
  issued_at: string | null;
  paid_at: string | null;
  clients?: {
    name: string;
  };
  pricing_packages?: {
    name: string;
  };
}

export interface InvoiceFormValues {
  client_id: string;
  pricing_package_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  due_date: Date;
  issued_at?: Date | null;
  paid_at?: Date | null;
}
