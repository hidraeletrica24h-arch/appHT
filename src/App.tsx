/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Clients } from './components/Clients';
import { Budgets } from './components/Budgets';
import { ServiceCatalog } from './components/ServiceCatalog';
import { MaterialCatalog } from './components/MaterialCatalog';
import { Packages } from './components/Packages';
import { ServiceOrders } from './components/ServiceOrders';
import { motion, AnimatePresence } from 'motion/react';
import { db, syncSupabaseToLocal } from './db';
import { supabase, checkSupabaseConnection } from './lib/supabase';

export default function App() {
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(true);
  const [supabaseStatus, setSupabaseStatus] = React.useState<{ success: boolean; error?: string } | null>(null);
  const [isCheckingSupabase, setIsCheckingSupabase] = React.useState(false);
  const [authStatus, setAuthStatus] = React.useState<'loading' | 'gateway' | 'authenticated'>('loading');

  React.useEffect(() => {
    // Check Authentication
    const role = localStorage.getItem('gestao_role');
    if (!role) {
      setAuthStatus('gateway');
      return;
    } else if (role === 'admin') {
      window.location.href = '/sistema-gestao/sistema/admin/index.html';
      return;
    } else {
      setAuthStatus('authenticated');
    }

    // Initial Sync from Supabase
    const initSync = async () => {
      setIsSyncing(true);
      await syncSupabaseToLocal();
      setIsSyncing(false);

      // Also check initial connection status
      const result = await checkSupabaseConnection();
      setSupabaseStatus(result);
    };
    initSync();

    // Periodic check every 30 seconds
    const interval = setInterval(async () => {
      const result = await checkSupabaseConnection();
      setSupabaseStatus(result);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleCheckSupabase = async () => {
    setIsCheckingSupabase(true);
    const result = await checkSupabaseConnection();
    setSupabaseStatus(result);
    setIsCheckingSupabase(false);
  };

  // Listen for auto-save events (optional, but good for feedback)
  React.useEffect(() => {
    const handleAutoSave = () => {
      setIsSaving(true);
      setTimeout(() => setIsSaving(false), 2000);
    };
    window.addEventListener('storage', handleAutoSave);
    return () => window.removeEventListener('storage', handleAutoSave);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'clients': return <Clients />;
      case 'budgets': return <Budgets />;
      case 'services-ele': return <ServiceCatalog category="eletrico" />;
      case 'services-hyd': return <ServiceCatalog category="hidraulico" />;
      case 'materials-ele': return <MaterialCatalog category="eletrico" />;
      case 'materials-hyd': return <MaterialCatalog category="hidraulico" />;
      case 'packages': return <Packages />;
      case 'orders': return <ServiceOrders />;
      case 'reports': return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
          <div className="p-6 bg-zinc-900 rounded-full text-zinc-500">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Relatórios Avançados</h2>
          <p className="text-zinc-400 max-w-md">Esta funcionalidade está sendo preparada para a próxima atualização do HidraElétrica PRO.</p>
        </div>
      );
      case 'settings': {
        const config = db.getConfig();
        const updateConfig = (key: string, value: string) => {
          db.saveConfig({ ...config, [key]: value });
          setIsSaving(true);
          setTimeout(() => setIsSaving(false), 1000);
        };

        return (
          <div className="max-w-2xl space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white">Configurações</h2>
              <p className="text-zinc-400">Personalize sua experiência no sistema.</p>
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                <h3 className="text-lg font-bold text-white">Dados da Empresa</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Nome Fantasia</label>
                    <input
                      defaultValue={config.companyName || "HidraElétrica PRO"}
                      onChange={(e) => updateConfig('companyName', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase">CNPJ</label>
                    <input
                      defaultValue={config.cnpj || "00.000.000/0001-00"}
                      onChange={(e) => updateConfig('cnpj', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                <h3 className="text-lg font-bold text-white">Backup e Dados</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">Exportar Banco de Dados</p>
                    <p className="text-xs text-zinc-500">Baixe todos os seus dados em formato JSON.</p>
                  </div>
                  <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-bold transition-colors">Exportar</button>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                  <div>
                    <p className="text-sm text-red-500 font-medium">Limpar Todos os Dados</p>
                    <p className="text-xs text-zinc-500">Esta ação é irreversível e apagará tudo.</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Tem certeza que deseja apagar tudo?')) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg text-sm font-bold transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                <h3 className="text-lg font-bold text-white">Conexão Supabase</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">Status da Conexão</p>
                    <p className="text-xs text-zinc-500">Verifique se a integração com o Supabase está ativa.</p>
                  </div>
                  <button
                    onClick={handleCheckSupabase}
                    disabled={isCheckingSupabase}
                    className="px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    {isCheckingSupabase ? 'Verificando...' : 'Verificar Conexão'}
                  </button>
                </div>
                {supabaseStatus && (
                  <div className={`p-4 rounded-xl text-sm font-medium ${supabaseStatus.success ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                    {supabaseStatus.success ? 'Conexão estabelecida com sucesso!' : `Erro na conexão: ${supabaseStatus.error}`}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }
      default: return <Dashboard />;
    }
  };

  const [loginForm, setLoginForm] = React.useState({ user: '', pass: '', isAdmin: false });
  const [loginError, setLoginError] = React.useState('');
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      // 1. Admin Logic
      if (loginForm.isAdmin) {
        if (loginForm.user === 'admin' && loginForm.pass === '2486') {
          localStorage.setItem('gestao_role', 'admin');
          window.location.href = '/sistema-gestao/sistema/admin/index.html';
          return;
        } else {
          setLoginError('Credenciais de administrador inválidas.');
          setIsLoggingIn(false);
          return;
        }
      }

      // 2. Client Logic
      if (!supabase) {
        setLoginError('Serviço de autenticação offline.');
        setIsLoggingIn(false);
        return;
      }

      const { data: userData, error: authError } = await (supabase as any)
        .from('gestao_clientes_as')
        .select('*')
        .eq('username', loginForm.user)
        .eq('password', loginForm.pass)
        .single();

      if (authError || !userData) {
        setLoginError('Usuário ou senha inválidos.');
      } else {
        localStorage.setItem('gestao_role', 'client');
        localStorage.setItem('gestao_user', JSON.stringify(userData));

        // Sincroniza dados do cliente após login
        await syncSupabaseToLocal();

        setAuthStatus('authenticated');
      }
    } catch (err: any) {
      setLoginError('Erro ao conectar ao servidor.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (authStatus === 'gateway') {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-900/10 blur-[120px] rounded-full animate-pulse delay-700" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md bg-zinc-900/50 border border-zinc-800 p-10 rounded-[40px] shadow-2xl backdrop-blur-xl"
        >
          <div className="text-center mb-10 space-y-2">
            <h1 className="text-4xl font-black font-outfit tracking-tighter">
              HIDRAELÉTRICA <span className="text-red-600">PRO</span>
            </h1>
            <p className="text-zinc-500 text-sm font-bold tracking-widest uppercase">Portal de Acesso</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="flex bg-zinc-950 p-1 rounded-2xl border border-zinc-800 mb-8">
              <button
                type="button"
                onClick={() => setLoginForm({ ...loginForm, isAdmin: false })}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!loginForm.isAdmin ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-500 hover:text-white'}`}
              >
                Eletricista
              </button>
              <button
                type="button"
                onClick={() => setLoginForm({ ...loginForm, isAdmin: true })}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${loginForm.isAdmin ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
              >
                ADMIN
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Usuário</label>
                <input
                  type="text"
                  required
                  value={loginForm.user}
                  onChange={(e) => setLoginForm({ ...loginForm, user: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-all font-medium text-white"
                  placeholder="Seu usuário"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Senha</label>
                <input
                  type="password"
                  required
                  value={loginForm.pass}
                  onChange={(e) => setLoginForm({ ...loginForm, pass: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-all font-medium text-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {loginError && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-[10px] font-bold uppercase tracking-widest text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                {loginError}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-red-900/20 active:scale-95 disabled:opacity-50"
            >
              {isLoggingIn ? 'Autenticando...' : 'Entrar no Sistema'}
            </button>
          </form>

          <p className="text-center mt-8 text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em]">
            HidraElétrica &copy; 2024
          </p>
        </motion.div>
      </div>
    );
  }

  if (isSyncing || authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white space-y-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-red-600 blur-[40px] opacity-20 rounded-full animate-pulse" />
          <div className="w-16 h-16 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin relative z-10" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Conectando ao Supabase...</h2>
          <p className="text-sm text-zinc-500">Sincronizando dados com a nuvem</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-red-600/30">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="lg:ml-64 min-h-screen">
        <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="lg:hidden w-10" /> {/* Spacer for mobile menu button */}
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-white hidden sm:block">HidraElétrica PRO</h1>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <div className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${isSaving ? 'animate-pulse' : ''}`} />
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Auto-save Ativo</span>
              </div>
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${supabaseStatus?.success
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                : 'bg-red-500/10 border-red-500/20 text-red-500'
                }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${supabaseStatus?.success ? 'bg-blue-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Supabase {supabaseStatus?.success ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-white">Administrador</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Porto Alegre, RS</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold shadow-lg shadow-red-600/20 cursor-pointer group relative"
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
            >
              AD
              <div className="absolute top-full mt-2 right-0 bg-red-600 text-[8px] font-black uppercase py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">SAIR</div>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
