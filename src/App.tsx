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

// Estados do fluxo de autenticação
type AppScreen = 'login' | 'portal' | 'tools';

export default function App() {
  const [screen, setScreen] = React.useState<AppScreen>(() => {
    const savedScreen = sessionStorage.getItem('gestao_screen');
    return (savedScreen as AppScreen) || 'login';
  });
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [supabaseStatus, setSupabaseStatus] = React.useState<{ success: boolean; error?: string } | null>(null);
  const [isCheckingSupabase, setIsCheckingSupabase] = React.useState(false);

  // Form de Login
  const [loginUser, setLoginUser] = React.useState('');
  const [loginPass, setLoginPass] = React.useState('');
  const [loginError, setLoginError] = React.useState('');
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  // Dados do usuário logado
  const [loggedUser, setLoggedUser] = React.useState<any>(() => {
    const savedUser = sessionStorage.getItem('gestao_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Persistir estado no sessionStorage
  React.useEffect(() => {
    sessionStorage.setItem('gestao_screen', screen);
    if (loggedUser) {
      sessionStorage.setItem('gestao_user', JSON.stringify(loggedUser));
    } else {
      sessionStorage.removeItem('gestao_user');
    }
  }, [screen, loggedUser]);

  // Supabase periodic check (só quando nas ferramentas)
  React.useEffect(() => {
    if (screen !== 'tools') return;

    // Heartbeat para marcar como online
    const updateOnlineStatus = async () => {
      if (supabase && loggedUser?.id && loggedUser?.role === 'client') {
        const now = new Date().toISOString();
        console.log(`[Heartbeat] Atualizando status para ${loggedUser.id} em ${now}`);
        try {
          const { error } = await (supabase as any)
            .from('gestao_clientes_as')
            .update({ last_seen: now })
            .eq('id', loggedUser.id);
          
          if (error) throw error;
        } catch (err) {
          console.error('[Heartbeat] Erro ao atualizar status online:', err);
        }
      }
    };

    // Executa imediatamente e depois a cada 30 segundos
    updateOnlineStatus();
    const heartbeatInterval = setInterval(updateOnlineStatus, 30000);

    const interval = setInterval(async () => {
      const result = await checkSupabaseConnection();
      setSupabaseStatus(result);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(heartbeatInterval);
    };
  }, [screen, loggedUser]);

  // Auto-save listener
  React.useEffect(() => {
    const handleAutoSave = () => {
      setIsSaving(true);
      setTimeout(() => setIsSaving(false), 2000);
    };
    window.addEventListener('storage', handleAutoSave);
    return () => window.removeEventListener('storage', handleAutoSave);
  }, []);

  // ══════════════════════════════════════════════
  // FUNÇÃO DE LOGIN
  // ══════════════════════════════════════════════
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      // Admin hardcoded
      if (loginUser === 'admin' && loginPass === '2486') {
        setLoggedUser({ role: 'admin', name: 'Administrador' });
        setScreen('portal');
        return;
      }

      // Cliente via Supabase
      if (!supabase) {
        setLoginError('Serviço de autenticação offline.');
        return;
      }

      const { data: userData, error } = await (supabase as any)
        .from('gestao_clientes_as')
        .select('*')
        .eq('username', loginUser)
        .eq('password', loginPass)
        .single();

      if (error || !userData) {
        setLoginError('Usuário ou senha inválidos.');
      } else {
        setLoggedUser({ ...userData, role: 'client' });
        setScreen('portal');
      }
    } catch {
      setLoginError('Erro ao conectar. Tente novamente.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ══════════════════════════════════════════════
  // FUNÇÕES DE NAVEGAÇÃO
  // ══════════════════════════════════════════════
  const goToTools = async () => {
    setIsSyncing(true);
    await syncSupabaseToLocal();
    const result = await checkSupabaseConnection();
    setSupabaseStatus(result);
    setIsSyncing(false);
    setScreen('tools');
  };

  const goToAdmin = () => {
    // Armazena sessão temporária (sessionStorage = fecha ao fechar a aba)
    sessionStorage.setItem('gestao_role', 'admin');
    sessionStorage.setItem('gestao_login_time', Date.now().toString());
    window.location.href = '/sistema-gestao/sistema/admin/index.html';
  };

  const handleLogout = () => {
    setLoggedUser(null);
    setLoginUser('');
    setLoginPass('');
    setLoginError('');
    setScreen('login');
    sessionStorage.clear();
  };

  const handleCheckSupabase = async () => {
    setIsCheckingSupabase(true);
    const result = await checkSupabaseConnection();
    setSupabaseStatus(result);
    setIsCheckingSupabase(false);
  };

  // ══════════════════════════════════════════════
  // TELA 1: LOGIN
  // ══════════════════════════════════════════════
  if (screen === 'login') {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-900/10 blur-[120px] rounded-full animate-pulse delay-700" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-10 space-y-3">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-600/10 border border-red-600/20 rounded-3xl mb-4">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-4xl font-black font-outfit tracking-tighter">
              HIDRAELÉTRICA <span className="text-red-600">PRO</span>
            </h1>
            <p className="text-zinc-500 text-sm font-bold tracking-widest uppercase">Sistema Profissional</p>
          </div>

          {/* Card de Login */}
          <div className="bg-zinc-900/60 border border-zinc-800 p-8 rounded-[36px] shadow-2xl backdrop-blur-xl">
            <h2 className="text-lg font-black text-white mb-6 text-center">Acesse sua conta</h2>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Usuário</label>
                <input
                  type="text"
                  required
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-white font-medium focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-all"
                  placeholder="Seu usuário ou apelido"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Senha</label>
                <input
                  type="password"
                  required
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-white font-medium focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-all"
                  placeholder="••••••••"
                />
              </div>

              {loginError && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                >
                  <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-red-400 text-xs font-bold">{loginError}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-5 bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-50 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-red-900/30"
              >
                {isLoggingIn ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Autenticando...
                  </span>
                ) : 'Entrar no Sistema'}
              </button>
            </form>
          </div>

          <p className="text-center mt-6 text-[10px] text-zinc-700 font-bold uppercase tracking-[0.2em]">
            HidraElétrica PRO © 2024 — Todos os direitos reservados
          </p>
        </motion.div>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // TELA 2: PORTAL DE ESCOLHA (após login)
  // ══════════════════════════════════════════════
  if (screen === 'portal') {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/8 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-900/8 blur-[120px] rounded-full animate-pulse delay-700" />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 w-full max-w-xl"
        >
          {/* Header */}
          <div className="text-center mb-10">
            <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">
              Bem-vindo, <span className="text-red-500">{loggedUser?.name || loggedUser?.username || 'Usuário'}</span>
            </p>
            <h1 className="text-4xl font-black font-outfit tracking-tighter">
              Selecione a <span className="text-red-600">Área</span>
            </h1>
            <p className="text-zinc-600 text-sm mt-2">Para onde deseja ir hoje?</p>
          </div>

          {/* Cards de escolha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
            {/* Área do Cliente */}
            <motion.button
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={goToTools}
              className="group bg-zinc-900/60 border border-zinc-800 hover:border-red-600/50 p-8 rounded-[32px] text-left transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(220,38,38,0.2)]"
            >
              <div className="w-14 h-14 bg-red-600/10 group-hover:bg-red-600 rounded-2xl flex items-center justify-center mb-5 transition-colors duration-300">
                <svg className="w-7 h-7 text-red-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-white mb-2">Área do Cliente</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">Orçamentos, clientes, pedidos e materiais.</p>
            </motion.button>

            {/* Área do Admin */}
            {loggedUser?.role === 'admin' ? (
              <motion.button
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={goToAdmin}
                className="group bg-zinc-900/60 border border-zinc-800 hover:border-zinc-600 p-8 rounded-[32px] text-left transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(255,255,255,0.05)]"
              >
                <div className="w-14 h-14 bg-zinc-800 group-hover:bg-zinc-700 rounded-2xl flex items-center justify-center mb-5 transition-colors duration-300">
                  <svg className="w-7 h-7 text-zinc-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-white mb-2">Painel Master</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">Gestão de assinantes, planos e controle financeiro.</p>
              </motion.button>
            ) : (
              <div className="bg-zinc-900/20 border border-zinc-900 p-8 rounded-[32px] opacity-40 cursor-not-allowed">
                <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center mb-5">
                  <svg className="w-7 h-7 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-zinc-600 mb-2">Painel Master</h3>
                <p className="text-zinc-700 text-sm">Acesso restrito ao administrador.</p>
              </div>
            )}
          </div>

          {/* Botão de sair */}
          <div className="text-center">
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-zinc-500 hover:text-red-500 text-sm font-bold uppercase tracking-widest transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sair / Trocar conta
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // TELA 3: CARREGANDO (sync)
  // ══════════════════════════════════════════════
  if (isSyncing) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white space-y-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-red-600 blur-[40px] opacity-20 rounded-full animate-pulse" />
          <div className="w-16 h-16 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin relative z-10" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Carregando dados...</h2>
          <p className="text-sm text-zinc-500">Sincronizando com a nuvem</p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // TELA 4: FERRAMENTAS (App de Orçamentos)
  // ══════════════════════════════════════════════
  const renderContent = () => {
    const config = db.getConfig();
    const appColor = config.appColor || '#dc2626'; // Default red-600

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
          <p className="text-zinc-400 max-w-md">Funcionalidade em preparação para a próxima atualização.</p>
        </div>
      );
      case 'settings': {
        const updateConfig = (key: string, value: any) => {
          db.saveConfig({ ...config, [key]: value });
          setIsSaving(true);
          setTimeout(() => setIsSaving(false), 1000);
        };
        return (
          <div className="max-w-4xl space-y-8 pb-20">
            <div>
              <h2 className="text-3xl font-bold text-white">Configurações</h2>
              <p className="text-zinc-400">Personalize sua experiência no sistema.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coluna 1: Visual e Empresa */}
              <div className="space-y-6">
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    Dados da Empresa
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nome Fantasia</label>
                      <input defaultValue={config.companyName || "HidraElétrica PRO"} onBlur={(e) => updateConfig('companyName', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-red-600/50 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">CNPJ / Documento</label>
                      <input defaultValue={config.cnpj || "00.000.000/0001-00"} onBlur={(e) => updateConfig('cnpj', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-red-600/50 outline-none" />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                    Identidade Visual
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cor Principal do App</label>
                      <div className="flex items-center gap-3">
                        <input type="color" defaultValue={appColor} onChange={(e) => updateConfig('appColor', e.target.value)} className="w-12 h-12 bg-transparent border-none cursor-pointer" />
                        <span className="text-xs text-zinc-400 font-mono uppercase">{appColor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Configurações do PDF
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Observações Padrão (Rodapé)</label>
                      <textarea defaultValue={config.pdfNotes || "Orçamento válido por 10 dias. Pagamento facilitado."} onBlur={(e) => updateConfig('pdfNotes', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-red-600/50 outline-none h-20 text-xs" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna 2: Bancos de Dados e Sistema */}
              <div className="space-y-6">
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.58 4 8 4s8-1.79 8-4M4 7c0-2.21 3.58-4 8-4s8 1.79 8 4m0 5c0 2.21-3.58 4-8 4s-8-1.79-8-4" /></svg>
                    Bancos de Dados
                  </h3>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Gerencie seus catálogos:</p>
                  <div className="grid grid-cols-1 gap-2">
                    <button onClick={() => setActiveTab('services-ele')} className="w-full flex items-center justify-between p-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all group">
                      <span className="text-sm font-bold text-zinc-300 group-hover:text-white">Serviços Elétricos</span>
                      <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <button onClick={() => setActiveTab('services-hyd')} className="w-full flex items-center justify-between p-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all group">
                      <span className="text-sm font-bold text-zinc-300 group-hover:text-white">Serviços Hidráulicos</span>
                      <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <button onClick={() => setActiveTab('materials-ele')} className="w-full flex items-center justify-between p-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all group">
                      <span className="text-sm font-bold text-zinc-300 group-hover:text-white">Materiais Elétricos</span>
                      <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <button onClick={() => setActiveTab('materials-hyd')} className="w-full flex items-center justify-between p-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all group">
                      <span className="text-sm font-bold text-zinc-300 group-hover:text-white">Materiais Hidráulicos</span>
                      <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Sistema & Cloud
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-medium">Supabase Cloud</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Sincronização em tempo real</p>
                    </div>
                    <button onClick={handleCheckSupabase} disabled={isCheckingSupabase} className="px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 rounded-lg text-xs font-black transition-colors disabled:opacity-50">
                      {isCheckingSupabase ? 'Verificando...' : 'Verificar'}
                    </button>
                  </div>
                  {supabaseStatus && (
                    <div className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest ${supabaseStatus.success ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                      {supabaseStatus.success ? 'Conexão OK' : `Erro: ${supabaseStatus.error}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }
      default: return <Dashboard />;
    }
  };

  const config = db.getConfig();
  const appColor = config.appColor || '#dc2626';

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-red-600/30" style={{ '--app-primary': appColor } as React.CSSProperties}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="lg:ml-64 min-h-screen">
        <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="lg:hidden w-10" />
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-white hidden sm:block">{config.companyName || "HidraElétrica PRO"}</h1>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <div className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${isSaving ? 'animate-pulse' : ''}`} />
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Auto-save</span>
              </div>
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${supabaseStatus?.success ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${supabaseStatus?.success ? 'bg-blue-500 animate-pulse' : 'bg-zinc-600'}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Supabase {supabaseStatus?.success ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Botão voltar ao portal */}
            <button
              onClick={() => setScreen('portal')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Portal
            </button>

            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-white">{loggedUser?.name || loggedUser?.username || 'Usuário'}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Área do Cliente</p>
            </div>

            {/* Botão Sair */}
            <button
              title="Sair"
              onClick={handleLogout}
              className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white font-bold shadow-lg shadow-red-600/20 cursor-pointer transition-colors group relative"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <div className="absolute top-full mt-2 right-0 bg-red-600 text-[8px] font-black uppercase py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">SAIR</div>
            </button>
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
