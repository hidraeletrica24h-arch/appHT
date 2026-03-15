import React from 'react';
import {
  ClipboardCheck,
  Calendar,
  User,
  Search,
  Clock,
  MoreVertical,
  Trash2
} from 'lucide-react';
import { db } from '../db';
import { ServiceOrder } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { motion } from 'motion/react';

export function ServiceOrders() {
  const [orders, setOrders] = React.useState<ServiceOrder[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    setOrders(db.getOrders());
  }, []);

  const completeOrder = (order: ServiceOrder) => {
    const updatedOrder = { ...order, status: 'completed' as const, endDate: new Date().toISOString() };
    db.saveOrder(updatedOrder);

    // Also update the original budget status
    const budgets = db.getBudgets();
    const budget = budgets.find(b => b.id === order.budgetId);
    if (budget) {
      db.saveBudget({ ...budget, status: 'completed' });
    }

    setOrders(db.getOrders());
  };

  const filtered = orders.filter(o =>
    o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) && o.status !== 'completed'
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Ordens de Serviço</h2>
          <p className="text-zinc-400">Acompanhe a execução dos serviços aprovados.</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          type="text"
          placeholder="Buscar por cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-600/10 flex items-center justify-center text-red-500">
                <ClipboardCheck size={24} />
              </div>
              <div>
                <h4 className="font-bold text-white text-lg">{order.clientName}</h4>
                <div className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <Calendar size={12} />
                    {formatDate(order.createdAt)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <Clock size={12} />
                    Início: {order.startDate ? formatDate(order.startDate) : 'Não definido'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Valor do Contrato</p>
                <p className="text-xl font-black text-white">{formatCurrency(order.total)}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-full uppercase">Em Execução</span>
                <button
                  onClick={() => completeOrder(order)}
                  className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                  title="Concluir Serviço"
                >
                  <ClipboardCheck size={20} />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir esta ordem de serviço?')) {
                      db.deleteOrder(order.id);
                      setOrders(db.getOrders());
                    }
                  }}
                  className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Excluir Ordem de Serviço"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="py-20 text-center text-zinc-500 italic bg-zinc-900/30 border border-zinc-800 border-dashed rounded-2xl">
            Nenhuma ordem de serviço em andamento.
          </div>
        )}
      </div>
    </div>
  );
}
