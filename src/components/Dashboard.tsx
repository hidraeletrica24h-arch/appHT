import React from 'react';
import {
  TrendingUp,
  Users,
  FileText,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { db } from '../db';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';

export function Dashboard() {
  const clients = db.getClients();
  const budgets = db.getBudgets();
  const orders = db.getOrders();

  const monthlyRevenue = budgets
    .filter(b => b.status === 'completed' || b.status === 'approved')
    .reduce((acc, curr) => acc + curr.total, 0);

  const stats = [
    { label: 'Faturamento Total', value: formatCurrency(monthlyRevenue), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Clientes Ativos', value: clients.length.toString(), icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Orçamentos', value: budgets.length.toString(), icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Ordens de Serviço', value: orders.length.toString(), icon: CheckCircle2, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">Dashboard</h2>
        <p className="text-zinc-400">Bem-vindo ao HidraElétrica PRO. Aqui está o resumo do seu negócio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-lg", stat.bg)}>
                <stat.icon className={stat.color} size={24} />
              </div>
              <span className="flex items-center text-xs font-medium text-emerald-500">
                <ArrowUpRight size={14} className="mr-1" />
                +12%
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-zinc-400 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <h3 className="text-lg font-semibold text-white mb-6">Serviços Recentes</h3>
          <div className="space-y-4">
            {budgets.slice(0, 5).map((budget) => (
              <div key={budget.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold">
                    {budget.clientName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{budget.clientName}</p>
                    <p className="text-xs text-zinc-500">{new Date(budget.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{formatCurrency(budget.total)}</p>
                  <span className={cn(
                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full",
                    budget.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                  )}>
                    {budget.status}
                  </span>
                </div>
              </div>
            ))}
            {budgets.length === 0 && (
              <p className="text-center py-8 text-zinc-500 italic">Nenhum orçamento registrado ainda.</p>
            )}
          </div>
        </div>

        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <h3 className="text-lg font-semibold text-white mb-6">Distribuição de Serviços</h3>
          <div className="space-y-6">
            {(() => {
              const services = db.getServices();
              const electricCount = budgets.filter(b => {
                const items = b.items || [];
                return items.some(i => {
                  const s = services.find(srv => srv.id === i.itemId);
                  return s?.category === 'eletrico';
                });
              }).length;

              const hydraulicCount = budgets.filter(b => {
                const items = b.items || [];
                return items.some(i => {
                  const s = services.find(srv => srv.id === i.itemId);
                  return s?.category === 'hidraulico';
                });
              }).length;

              const totalCount = electricCount + hydraulicCount || 1;
              const elePerc = Math.round((electricCount / totalCount) * 100);
              const hydPerc = Math.round((hydraulicCount / totalCount) * 100);

              return (
                <>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-zinc-400">Elétricos</span>
                      <span className="text-white font-medium">{elePerc}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${elePerc}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-zinc-400">Hidráulicos</span>
                      <span className="text-white font-medium">{hydPerc}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${hydPerc}%` }} />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
