import React from 'react';
import {
  Plus,
  Search,
  FileText,
  Download,
  FileSpreadsheet,
  Trash2,
  Eye,
  CheckCircle,
  X,
  PlusCircle,
  Package,
  Wrench
} from 'lucide-react';
import { db } from '../db';
import { Budget, Client, BudgetItem, Material, Service } from '../types';
import { motion } from 'motion/react';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export function Budgets() {
  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  // Form State
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const [items, setItems] = React.useState<BudgetItem[]>([]);
  const [discount, setDiscount] = React.useState(0);

  const clients = db.getClients();
  const allMaterials = db.getMaterials();
  const allServices = db.getServices();

  React.useEffect(() => {
    setBudgets(db.getBudgets());
  }, []);

  const laborTotal = items
    .filter(i => i.type === 'service')
    .reduce((acc, curr) => acc + curr.totalPrice, 0);

  const materialsTotal = items
    .filter(i => i.type === 'material')
    .reduce((acc, curr) => acc + curr.totalPrice, 0);

  const total = laborTotal + materialsTotal - discount;

  const updateStatus = (id: string, status: Budget['status']) => {
    const budget = budgets.find(b => b.id === id);
    if (!budget) return;

    const updated = { ...budget, status };
    db.saveBudget(updated);

    // If approved, automatically create a Service Order
    if (status === 'approved') {
      const order = {
        ...updated,
        budgetId: updated.id,
        startDate: new Date().toISOString(),
      };
      db.saveOrder(order);
    }

    setBudgets(db.getBudgets());
  };

  const addItem = (type: 'service' | 'material', id: string) => {
    if (type === 'service') {
      const service = allServices.find(s => s.id === id);
      if (!service) return;

      const newItem: BudgetItem = {
        id: crypto.randomUUID(),
        type: 'service',
        itemId: service.id,
        name: service.name,
        quantity: 1,
        unitPrice: service.basePrice,
        totalPrice: service.basePrice,
      };
      setItems([...items, newItem]);

      // Automatic Material Suggestion
      if (service.suggestedMaterials.length > 0) {
        const suggestedItems: BudgetItem[] = service.suggestedMaterials
          .map(mId => {
            const mat = allMaterials.find(m => m.id === mId);
            if (!mat) return null;
            return {
              id: crypto.randomUUID(),
              type: 'material',
              itemId: mat.id,
              name: mat.name,
              quantity: 1,
              unitPrice: mat.price,
              totalPrice: mat.price,
            } as BudgetItem;
          })
          .filter(i => i !== null) as BudgetItem[];

        setItems(prev => [...prev, ...suggestedItems]);
      }
    } else {
      const material = allMaterials.find(m => m.id === id);
      if (!material) return;

      const newItem: BudgetItem = {
        id: crypto.randomUUID(),
        type: 'material',
        itemId: material.id,
        name: material.name,
        quantity: 1,
        unitPrice: material.price,
        totalPrice: material.price,
      };
      setItems([...items, newItem]);
    }
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItemQuantity = (id: string, qty: number) => {
    setItems(items.map(i => {
      if (i.id === id) {
        return { ...i, quantity: qty, totalPrice: qty * i.unitPrice };
      }
      return i;
    }));
  };

  const updateItemPrice = (id: string, price: number) => {
    setItems(items.map(i => {
      if (i.id === id) {
        return { ...i, unitPrice: price, totalPrice: i.quantity * price };
      }
      return i;
    }));
  };

  const handleSave = () => {
    if (!selectedClient) return alert('Selecione um cliente');
    if (items.length === 0) return alert('Adicione pelo menos um item');

    const budget: Budget = {
      id: crypto.randomUUID(),
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      items,
      laborTotal,
      materialsTotal,
      discount,
      total,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    db.saveBudget(budget);
    setBudgets(db.getBudgets());
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedClient(null);
    setItems([]);
    setDiscount(0);
  };

  const generatePDF = (budget: Budget) => {
    try {
      const doc = new jsPDF();
      const client = db.getClients().find(c => c.id === budget.clientId);

      // Header
      doc.setFillColor(20, 20, 20);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('Hidra', 20, 25);
      doc.setTextColor(220, 38, 38);
      doc.text('Elétrica PRO', 42, 25);

      doc.setTextColor(150, 150, 150);
      doc.setFontSize(10);
      doc.text('ORÇAMENTO PROFISSIONAL', 150, 25);

      // Client Info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('DADOS DO CLIENTE', 20, 55);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Nome: ${budget.clientName}`, 20, 62);
      doc.text(`Documento: ${client?.document || 'N/A'}`, 20, 67);
      doc.text(`Endereço: ${client?.address || 'N/A'}`, 20, 72);
      doc.text(`Cidade: ${client?.city || 'N/A'}`, 20, 77);
      doc.text(`Data: ${formatDate(budget.createdAt)}`, 150, 62);
      doc.text(`Orçamento ID: ${budget.id.slice(0, 8)}`, 150, 67);

      // Table
      const tableData = budget.items.map(item => [
        item.name,
        item.type === 'service' ? 'Serviço' : 'Material',
        item.quantity,
        formatCurrency(item.unitPrice),
        formatCurrency(item.totalPrice)
      ]);

      autoTable(doc, {
        startY: 85,
        head: [['Descrição', 'Tipo', 'Qtd', 'V. Unit', 'V. Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [220, 38, 38] },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;

      // Totals
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Mão de Obra: ${formatCurrency(budget.laborTotal)}`, 130, finalY);
      doc.text(`Total Materiais: ${formatCurrency(budget.materialsTotal)}`, 130, finalY + 7);
      if (budget.discount > 0) {
        doc.text(`Desconto: - ${formatCurrency(budget.discount)}`, 130, finalY + 14);
      }
      doc.setFontSize(14);
      doc.setTextColor(220, 38, 38);
      doc.text(`VALOR TOTAL: ${formatCurrency(budget.total)}`, 130, finalY + 25);

      // Signature
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.line(20, finalY + 50, 90, finalY + 50);
      doc.text('Assinatura do Prestador', 35, finalY + 55);
      doc.line(120, finalY + 50, 190, finalY + 50);
      doc.text('Assinatura do Cliente', 140, finalY + 55);

      const safeName = budget.clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(`orcamento_${safeName}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.');
    }
  };

  const generateExcel = (budget: Budget) => {
    const materials = budget.items.filter(i => i.type === 'material');
    const data = materials.map(m => ({
      'Material': m.name,
      'Quantidade': m.quantity,
      'Valor Unitário': m.unitPrice,
      'Valor Total': m.totalPrice
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Materiais");
    XLSX.writeFile(wb, `materiais_${budget.clientName.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Orçamentos</h2>
          <p className="text-zinc-400">Crie e gerencie propostas comerciais.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
        >
          <Plus size={18} />
          Novo Orçamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map((budget) => (
          <motion.div
            key={budget.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-white text-lg">{budget.clientName}</h4>
                <p className="text-xs text-zinc-500">{formatDate(budget.createdAt)}</p>
              </div>
              <span className={cn(
                "text-[10px] uppercase font-bold px-2 py-1 rounded-full",
                budget.status === 'pending' && "bg-amber-500/10 text-amber-500",
                budget.status === 'approved' && "bg-blue-500/10 text-blue-500",
                budget.status === 'completed' && "bg-emerald-500/10 text-emerald-500",
                budget.status === 'cancelled' && "bg-red-500/10 text-red-500"
              )}>
                {budget.status === 'pending' ? 'Pendente' :
                  budget.status === 'approved' ? 'Aprovado' :
                    budget.status === 'completed' ? 'Concluído' : 'Cancelado'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-zinc-800">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Mão de Obra</p>
                <p className="text-sm font-medium text-white">{formatCurrency(budget.laborTotal)}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Materiais</p>
                <p className="text-sm font-medium text-white">{formatCurrency(budget.materialsTotal)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xl font-bold text-red-500">{formatCurrency(budget.total)}</p>
              <div className="flex gap-2">
                {budget.status === 'pending' && (
                  <>
                    <button
                      onClick={() => updateStatus(budget.id, 'approved')}
                      className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                      title="Aprovar Orçamento"
                    >
                      <CheckCircle size={18} />
                    </button>
                    <button
                      onClick={() => updateStatus(budget.id, 'cancelled')}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Negar Orçamento"
                    >
                      <X size={18} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => generatePDF(budget)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Gerar PDF"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={() => generateExcel(budget)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Exportar Materiais"
                >
                  <FileSpreadsheet size={18} />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir este orçamento?')) {
                      db.deleteBudget(budget.id);
                      setBudgets(db.getBudgets());
                    }
                  }}
                  className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Excluir Orçamento"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        {budgets.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-500 italic bg-zinc-900/50 border border-zinc-800 border-dashed rounded-2xl">
            Nenhum orçamento criado ainda. Clique em "Novo Orçamento" para começar.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Novo Orçamento Profissional</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Selection Column */}
              <div className="lg:col-span-1 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">1. Selecionar Cliente</label>
                  <select
                    onChange={(e) => setSelectedClient(clients.find(c => c.id === e.target.value) || null)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                  >
                    <option value="">Selecione um cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">2. Adicionar Serviços</label>
                  <div className="max-h-48 overflow-y-auto border border-zinc-800 rounded-xl bg-zinc-950 divide-y divide-zinc-800">
                    {allServices.map(s => (
                      <button
                        key={s.id}
                        onClick={() => addItem('service', s.id)}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white flex justify-between items-center"
                      >
                        <span className="truncate">{s.name}</span>
                        <PlusCircle size={14} className="text-red-500" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">3. Adicionar Materiais</label>
                  <div className="max-h-48 overflow-y-auto border border-zinc-800 rounded-xl bg-zinc-950 divide-y divide-zinc-800">
                    {allMaterials.map(m => (
                      <button
                        key={m.id}
                        onClick={() => addItem('material', m.id)}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white flex justify-between items-center"
                      >
                        <span className="truncate">{m.name}</span>
                        <PlusCircle size={14} className="text-blue-500" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Items Column */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-zinc-900 border-b border-zinc-800">
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase">Item</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase">Qtd</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase">Unitário</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {items.map(item => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {item.type === 'service' ? <Wrench size={14} className="text-red-500" /> : <Package size={14} className="text-blue-500" />}
                              <span className="text-sm text-white font-medium">{item.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="w-16 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-zinc-500">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                                className="w-20 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-sm"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-white font-bold">{formatCurrency(item.totalPrice)}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => removeItem(item.id)} className="text-zinc-500 hover:text-red-500">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-zinc-600 italic">Nenhum item adicionado.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Total Mão de Obra:</span>
                    <span className="text-white font-bold">{formatCurrency(laborTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Total Materiais:</span>
                    <span className="text-white font-bold">{formatCurrency(materialsTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Desconto:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">R$</span>
                      <input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        className="w-24 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white text-right"
                      />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-zinc-800 flex justify-between items-center">
                    <span className="text-lg font-bold text-white">TOTAL FINAL:</span>
                    <span className="text-3xl font-black text-red-500">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 bg-zinc-950/50 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-zinc-400 hover:text-white font-medium">Cancelar</button>
              <button
                onClick={handleSave}
                className="px-8 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all transform hover:scale-105"
              >
                Salvar Orçamento
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
