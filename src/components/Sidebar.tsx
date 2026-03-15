import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Zap,
  Droplets,
  Package,
  Wrench,
  ClipboardList,
  BarChart3,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'budgets', label: 'Orçamentos', icon: FileText },
  { id: 'services-ele', label: 'Serviços Elétricos', icon: Zap },
  { id: 'services-hyd', label: 'Serviços Hidráulicos', icon: Droplets },
  { id: 'materials-ele', label: 'Materiais Elétricos', icon: Package },
  { id: 'materials-hyd', label: 'Materiais Hidráulicos', icon: Wrench },
  { id: 'packages', label: 'Pacotes de Serviços', icon: ClipboardList },
  { id: 'orders', label: 'Ordem de Serviço', icon: ClipboardList },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'settings', label: 'Configurações', icon: Settings },
];



export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-800 rounded-md text-white"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-zinc-950 border-r border-zinc-800 transition-transform duration-300 ease-in-out lg:translate-x-0",
        !isOpen && "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-zinc-800">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-white">Hidra</span>
              <span className="text-red-600">Elétrica</span>
              <span className="ml-2 text-xs font-medium text-zinc-500 uppercase tracking-widest">PRO</span>
            </h1>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeTab === item.id
                    ? "bg-red-600 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-zinc-800 space-y-1">
            <div className="px-3 text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
              Criador Deividy Max
            </div>
            <div className="flex items-center gap-3 px-3 py-2 text-zinc-500 text-xs">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Modo Offline Ativo
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
