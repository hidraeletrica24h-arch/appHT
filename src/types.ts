export interface Client {
  id: string;
  name: string;
  phone: string;
  document: string; // CPF or CNPJ
  address: string;
  city: string;
  observations: string;
  createdAt: string;
}

export interface Material {
  id: string;
  name: string;
  category: 'eletrico' | 'hidraulico';
  price: number;
  unit: string;
  order?: number;
}

export interface Service {
  id: string;
  name: string;
  category: 'eletrico' | 'hidraulico';
  basePrice: number;
  suggestedMaterials: string[]; // IDs of materials
}

export interface BudgetItem {
  id: string;
  type: 'service' | 'material';
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Budget {
  id: string;
  clientId: string;
  clientName: string;
  items: BudgetItem[];
  laborTotal: number;
  materialsTotal: number;
  discount: number;
  total: number;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface ServiceOrder extends Budget {
  budgetId: string;
  startDate?: string;
  endDate?: string;
  technicianName?: string;
}
