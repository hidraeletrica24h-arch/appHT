import { Client, Budget, ServiceOrder, Material, Service, BudgetItem } from './types';
import { INITIAL_MATERIALS, INITIAL_SERVICES } from './data';
import { supabase } from './lib/supabase';

const STORAGE_KEYS = {
  CLIENTS: 'hidra_eletrica_clients',
  BUDGETS: 'hidra_eletrica_budgets',
  SERVICE_ORDERS: 'hidra_eletrica_orders',
  MATERIALS: 'hidra_eletrica_materials',
  SERVICES: 'hidra_eletrica_services',
  PACKAGES: 'hidra_eletrica_packages',
  CONFIG: 'hidra_eletrica_config',
};

// Dispara eventos de storage para a UI atualizar (loading indicator)
const triggerEvent = () => {
  window.dispatchEvent(new Event('storage'));
};

const syncToSupabaseConfig = async () => {
  if (!supabase) return;
  const config = db.getConfig();
  if (Object.keys(config).length > 0) {
    await supabase.from('configs').upsert({ key: 'appOptions', value: config }, { onConflict: 'key' });
  }
};

// Sincronização INICIAL (Supabase -> LocalStorage) do banco de dados na web.
export const syncSupabaseToLocal = async () => {
  if (!supabase) return false;

  try {
    const promises = [
      supabase.from('clientes_os').select('*'),
      supabase.from('materials').select('*'),
      supabase.from('services').select('*'),
      supabase.from('budgets').select('*, budget_items(*)'),
      supabase.from('service_orders').select('*'),
      supabase.from('packages').select('*')
    ];

    const [
      clRes, matRes, servRes, budgRes, ordRes, packRes
    ] = await Promise.all(promises);

    if (clRes.data) {
      db.setSync(STORAGE_KEYS.CLIENTS, clRes.data.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        document: c.document || '',
        address: c.address || '',
        city: c.city || '',
        observations: c.observations || '',
        createdAt: c.created_at || new Date().toISOString()
      })));
    }

    if (matRes.data && matRes.data.length > 0) {
      db.setSync(STORAGE_KEYS.MATERIALS, matRes.data);
    }

    if (servRes.data && servRes.data.length > 0) {
      db.setSync(STORAGE_KEYS.SERVICES, servRes.data.map((s: any) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        basePrice: s.base_price || 0,
        suggestedMaterials: s.suggested_materials || []
      })));
    }

    // Budgets need nested mapping mapping returning to standard UI array
    if (budgRes.data) {
      const mappedBudgets = budgRes.data.map(b => ({
        id: b.id,
        clientId: b.client_id,
        clientName: b.client_name,
        laborTotal: b.labor_total,
        materialsTotal: b.materials_total,
        discount: b.discount,
        total: b.total,
        status: b.status,
        createdAt: b.created_at,
        items: b.budget_items ? b.budget_items.map((i: any) => ({
          id: i.id,
          type: i.type,
          itemId: i.item_id,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          totalPrice: i.total_price
        })) : []
      }));
      db.setSync(STORAGE_KEYS.BUDGETS, mappedBudgets);
    }

    if (ordRes.data) {
      const mappedOrders = ordRes.data.map(o => ({
        id: o.id,
        budgetId: o.budget_id,
        clientId: o.client_id,
        clientName: o.client_name,
        startDate: o.start_date,
        endDate: o.end_date,
        technicianName: o.technician_name,
        status: o.status,
        total: o.total,
        createdAt: o.created_at
      }));
      db.setSync(STORAGE_KEYS.SERVICE_ORDERS, mappedOrders);
    }

    if (packRes.data) db.setSync(STORAGE_KEYS.PACKAGES, packRes.data);

    const confRes = await supabase.from('configs').select('*').eq('key', 'appOptions').limit(1);
    if (confRes.data && confRes.data.length > 0) db.setSync(STORAGE_KEYS.CONFIG, confRes.data[0].value);

    return true;
  } catch (err) {
    console.error("Erro ao sincronizar do Supabase", err);
    return false;
  }
};


export const db = {
  get: <T>(key: string, defaultValue: T): T => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  },

  // Set internally without triggering supabase upserts
  setSync: <T>(key: string, value: T): void => {
    localStorage.setItem(key, JSON.stringify(value));
  },

  set: <T>(key: string, value: T): void => {
    localStorage.setItem(key, JSON.stringify(value));
  },

  // Clients
  getClients: (): Client[] => db.get(STORAGE_KEYS.CLIENTS, []),
  saveClient: (client: Client) => {
    const clients = db.getClients();
    const index = clients.findIndex(c => c.id === client.id);
    if (index >= 0) clients[index] = client;
    else clients.push(client);

    db.setSync(STORAGE_KEYS.CLIENTS, clients);
    triggerEvent();

    if (supabase) {
      supabase.from('clientes_os').upsert({
        id: client.id,
        name: client.name,
        phone: client.phone || null,
        document: client.document || null,
        address: client.address || null,
        city: client.city || null,
        observations: client.observations || null,
        created_at: client.createdAt || new Date().toISOString()
      }).then(({ error }) => { if (error) console.error("Client Upsert Erro:", error); });
    }
  },
  deleteClient: (id: string) => {
    const clients = db.getClients();
    db.setSync(STORAGE_KEYS.CLIENTS, clients.filter(c => c.id !== id));
    triggerEvent();

    if (supabase) {
      supabase.from('clientes_os').delete().eq('id', id).then(({ error }) => { if (error) console.error("Client Delete Erro:", error); });
    }
  },

  // Budgets
  getBudgets: (): Budget[] => db.get(STORAGE_KEYS.BUDGETS, []),
  saveBudget: async (budget: Budget) => {
    const budgets = db.getBudgets();
    const index = budgets.findIndex(b => b.id === budget.id);
    const action = index >= 0 ? 'update' : 'create';
    if (index >= 0) budgets[index] = budget;
    else budgets.push(budget);

    db.setSync(STORAGE_KEYS.BUDGETS, budgets);
    triggerEvent();

    if (supabase) {
      const { error: error1 } = await supabase.from('budgets').upsert({
        id: budget.id,
        client_id: budget.clientId,
        client_name: budget.clientName,
        labor_total: budget.laborTotal || 0,
        materials_total: budget.materialsTotal || 0,
        discount: budget.discount || 0,
        total: budget.total || 0,
        status: budget.status || 'pending',
        created_at: budget.createdAt || new Date().toISOString()
      });
      if (error1) console.error("Budget Upsert Erro:", error1);

      if (action === 'update') {
        const { error: error2 } = await supabase.from('budget_items').delete().eq('budget_id', budget.id);
        if (error2) console.error("Budget Delete Items Erro:", error2);
      }

      const itemsToInsert = budget.items.map(item => ({
        id: item.id || crypto.randomUUID(),
        budget_id: budget.id,
        type: item.type,
        item_id: item.itemId,
        name: item.name,
        quantity: item.quantity || 1,
        unit_price: item.unitPrice || 0,
        total_price: item.totalPrice || 0
      }));

      if (itemsToInsert.length > 0) {
        const { error: error3 } = await supabase.from('budget_items').insert(itemsToInsert);
        if (error3) console.error("Budget Items Erro:", error3);
      }
    }
  },
  deleteBudget: async (id: string) => {
    const budgets = db.getBudgets();
    db.setSync(STORAGE_KEYS.BUDGETS, budgets.filter(b => b.id !== id));
    triggerEvent();

    if (supabase) {
      // 1. Verificar se existem Ordens de Serviço vinculadas
      const { data: linkedOrders } = await supabase
        .from('service_orders')
        .select('id')
        .eq('budget_id', id);

      if (linkedOrders && linkedOrders.length > 0) {
        if (!confirm(`Este orçamento possui ${linkedOrders.length} Ordem(ns) de Serviço vinculada(s). Deseja excluir o orçamento e todas as suas ordens de serviço?`)) {
          return;
        }
        // Excluir as ordens de serviço vinculadas primeiro (para evitar erro de FK)
        await supabase.from('service_orders').delete().eq('budget_id', id);
        
        // Atualizar o estado local das ordens de serviço também
        const orders = db.getOrders();
        db.setSync(STORAGE_KEYS.SERVICE_ORDERS, orders.filter(o => o.budgetId !== id));
      }

      // 2. Excluir itens do orçamento
      await supabase.from('budget_items').delete().eq('budget_id', id);

      // 3. Excluir o orçamento
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (error) console.error("Budget Delete Erro:", error);
    }
  },

  // Service Orders
  getOrders: (): ServiceOrder[] => db.get(STORAGE_KEYS.SERVICE_ORDERS, []),
  saveOrder: (order: ServiceOrder) => {
    const orders = db.getOrders();
    const index = orders.findIndex(o => o.id === order.id);
    if (index >= 0) orders[index] = order;
    else orders.push(order);

    db.setSync(STORAGE_KEYS.SERVICE_ORDERS, orders);
    triggerEvent();

    if (supabase) {
      supabase.from('service_orders').upsert({
        id: order.id,
        budget_id: order.budgetId,
        client_id: order.clientId,
        client_name: order.clientName,
        start_date: order.startDate || null,
        end_date: order.endDate || null,
        technician_name: order.technicianName || null,
        status: order.status || 'pending',
        total: order.total || 0
      }).then(({ error }) => { if (error) console.error("Orders Erro:", error); });
    }
  },
  deleteOrder: (id: string) => {
    const orders = db.getOrders();
    db.setSync(STORAGE_KEYS.SERVICE_ORDERS, orders.filter(o => o.id !== id));
    triggerEvent();
    if (supabase) {
      supabase.from('service_orders').delete().eq('id', id).then(({ error }) => { if (error) console.error("Order Delete Erro:", error); });
    }
  },

  // Materials & Services
  getMaterials: (): Material[] => {
    const stored = db.get(STORAGE_KEYS.MATERIALS, null);
    if (!stored) {
      db.setSync(STORAGE_KEYS.MATERIALS, INITIAL_MATERIALS);
      return INITIAL_MATERIALS;
    }
    return stored;
  },
  saveMaterial: (material: Material) => {
    const materials = db.getMaterials();
    const index = materials.findIndex(m => m.id === material.id);
    if (index >= 0) materials[index] = material;
    else materials.push(material);

    db.setSync(STORAGE_KEYS.MATERIALS, materials);
    triggerEvent();

    if (supabase) {
      supabase.from('materials').upsert({
        id: material.id,
        name: material.name,
        category: material.category,
        price: material.price || 0,
        unit: material.unit || 'un',
        "order": material.order || 0
      }).then(({ error }) => { if (error) console.error("Materials Erro:", error); });
    }
  },
  saveMaterialsBatch: async (newMaterials: Material[]) => {
    const materials = db.getMaterials();
    const updatedMaterials = [...materials];
    
    newMaterials.forEach(material => {
      const index = updatedMaterials.findIndex(m => m.id === material.id);
      if (index >= 0) updatedMaterials[index] = material;
      else updatedMaterials.push(material);
    });

    db.setSync(STORAGE_KEYS.MATERIALS, updatedMaterials);
    triggerEvent();

    if (supabase && newMaterials.length > 0) {
      const { error } = await supabase.from('materials').upsert(
        newMaterials.map(m => ({
          id: m.id,
          name: m.name,
          category: m.category,
          price: m.price || 0,
          unit: m.unit || 'un',
          "order": m.order || 0
        }))
      );
      if (error) console.error("Materials Batch Erro:", error);
    }
  },
  deleteMaterial: (id: string) => {
    const materials = db.getMaterials();
    db.setSync(STORAGE_KEYS.MATERIALS, materials.filter(m => m.id !== id));
    triggerEvent();
    if (supabase) {
      supabase.from('materials').delete().eq('id', id).then(({ error }) => { if (error) console.error("Material Delete Erro:", error); });
    }
  },

  getServices: (): Service[] => {
    const stored = db.get(STORAGE_KEYS.SERVICES, null);
    if (!stored) {
      db.setSync(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
      return INITIAL_SERVICES;
    }
    return stored;
  },
  saveService: (service: Service) => {
    const services = db.getServices();
    const index = services.findIndex(s => s.id === service.id);
    if (index >= 0) services[index] = service;
    else services.push(service);

    db.setSync(STORAGE_KEYS.SERVICES, services);
    triggerEvent();

    if (supabase) {
      supabase.from('services').upsert({
        id: service.id,
        name: service.name,
        category: service.category,
        base_price: service.basePrice || 0,
        suggested_materials: service.suggestedMaterials || []
      }).then(({ error }) => { if (error) console.error("Services Erro:", error); });
    }
  },
  saveServicesBatch: async (newServices: Service[]) => {
    const services = db.getServices();
    const updatedServices = [...services];
    
    newServices.forEach(service => {
      const index = updatedServices.findIndex(s => s.id === service.id);
      if (index >= 0) updatedServices[index] = service;
      else updatedServices.push(service);
    });

    db.setSync(STORAGE_KEYS.SERVICES, updatedServices);
    triggerEvent();

    if (supabase && newServices.length > 0) {
      const { error } = await supabase.from('services').upsert(
        newServices.map(s => ({
          id: s.id,
          name: s.name,
          category: s.category,
          base_price: s.basePrice || 0,
          suggested_materials: s.suggestedMaterials || []
        }))
      );
      if (error) console.error("Services Batch Erro:", error);
    }
  },
  deleteService: (id: string) => {
    const services = db.getServices();
    db.setSync(STORAGE_KEYS.SERVICES, services.filter(s => s.id !== id));
    triggerEvent();
    if (supabase) {
      supabase.from('services').delete().eq('id', id).then(({ error }) => { if (error) console.error("Service Delete Erro:", error); });
    }
  },

  getPackages: (): any[] => db.get(STORAGE_KEYS.PACKAGES, []),
  savePackage: (pkg: any) => {
    const pkgs = db.getPackages();
    const index = pkgs.findIndex(p => p.id === pkg.id);
    if (index >= 0) pkgs[index] = pkg;
    else pkgs.push(pkg);

    db.setSync(STORAGE_KEYS.PACKAGES, pkgs);
    triggerEvent();

    if (supabase) {
      supabase.from('packages').upsert({
        id: pkg.id, name: pkg.name, description: pkg.description, price: pkg.price, items: pkg.items
      }).then(({ error }) => { if (error) console.error("Packages Erro:", error); });
    }
  },
  savePackagesBatch: async (newPackages: any[]) => {
    const pkgs = db.getPackages();
    const updatedPkgs = [...pkgs];
    
    newPackages.forEach(pkg => {
      const index = updatedPkgs.findIndex(p => p.id === pkg.id);
      if (index >= 0) updatedPkgs[index] = pkg;
      else updatedPkgs.push(pkg);
    });

    db.setSync(STORAGE_KEYS.PACKAGES, updatedPkgs);
    triggerEvent();

    if (supabase && newPackages.length > 0) {
      const { error } = await supabase.from('packages').upsert(
        newPackages.map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          description: pkg.description,
          price: pkg.price || 0,
          items: pkg.items || []
        }))
      );
      if (error) console.error("Packages Batch Erro:", error);
    }
  },
  deletePackage: (id: string) => {
    const pkgs = db.getPackages();
    db.setSync(STORAGE_KEYS.PACKAGES, pkgs.filter(p => p.id !== id));
    triggerEvent();
    if (supabase) {
      supabase.from('packages').delete().eq('id', id).then(({ error }) => { if (error) console.error("Package Delete Erro:", error); });
    }
  },

  getConfig: (): any => db.get(STORAGE_KEYS.CONFIG, {}),
  saveConfig: (config: any) => {
    db.setSync(STORAGE_KEYS.CONFIG, config);
    triggerEvent();
    syncToSupabaseConfig();
  },
};
