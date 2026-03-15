-- ============================================================
-- SCRIPT SQL DEFINITIVO - HIDRAELÉTRICA PRO
-- Execute TUDO isso no SQL Editor do Supabase
-- ============================================================

-- ╔══════════════════════════════════════════════════════════╗
-- ║  PARTE 1: TABELAS DO APP DE ORÇAMENTOS (clientes_os)    ║
-- ╚══════════════════════════════════════════════════════════╝

-- Renomear 'clients' para 'clientes_os' (App de Orçamentos)
ALTER TABLE IF EXISTS public.clients RENAME TO clientes_os;

-- Caso ainda não exista, cria direto com o nome correto
CREATE TABLE IF NOT EXISTS public.clientes_os (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    document TEXT,
    address TEXT,
    city TEXT,
    observations TEXT,
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Atualizar referência nas FK de budgets e service_orders
-- (o PostgreSQL renomeia FKs automaticamente, mas garantimos o RLS)
ALTER TABLE IF EXISTS public.clientes_os ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total clientes OS" ON public.clientes_os;
DROP POLICY IF EXISTS "Allow public access" ON public.clientes_os;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.clientes_os;
CREATE POLICY "Acesso total clientes OS" ON public.clientes_os FOR ALL USING (true);


-- ╔══════════════════════════════════════════════════════════╗
-- ║  PARTE 2: TABELAS DO PAINEL ADMIN (gestao_clientes_as)  ║
-- ╚══════════════════════════════════════════════════════════╝

-- Renomear etapas históricas (tentará cada passo, ignora se já renomeado)
ALTER TABLE IF EXISTS public.gestao_clientes RENAME TO gestao_clientes_as;
ALTER TABLE IF EXISTS public.gestao_clientes_assinantes RENAME TO gestao_clientes_as;

-- Caso ainda não exista, cria direto com o nome correto
CREATE TABLE IF NOT EXISTS public.gestao_clientes_as (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE IF EXISTS public.gestao_clientes_as ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura pública para login" ON public.gestao_clientes_as;
DROP POLICY IF EXISTS "Admin pode tudo" ON public.gestao_clientes_as;
DROP POLICY IF EXISTS "Admin controla tudo" ON public.gestao_clientes_as;
CREATE POLICY "Leitura pública para login" ON public.gestao_clientes_as FOR SELECT USING (true);
CREATE POLICY "Admin controla tudo" ON public.gestao_clientes_as FOR ALL USING (true);


-- ╔══════════════════════════════════════════════════════════╗
-- ║  PARTE 3: PLANOS DE ASSINATURA                          ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.gestao_planos (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT
);

ALTER TABLE IF EXISTS public.gestao_planos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Público vê planos" ON public.gestao_planos;
CREATE POLICY "Público vê planos" ON public.gestao_planos FOR SELECT USING (true);
CREATE POLICY "Admin edita planos" ON public.gestao_planos FOR ALL USING (true);

-- Insere planos (Pro R$25 e Premium R$40 — sem plano básico)
INSERT INTO public.gestao_planos (id, name, price, description) VALUES
('pro', 'Plano Profissional', 25.00, 'Ferramentas completas para eletricistas e hidráulicos.'),
('premium', 'Plano Premium', 40.00, 'Suporte VIP e relatórios avançados.')
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, name = EXCLUDED.name;


-- ╔══════════════════════════════════════════════════════════╗
-- ║  PARTE 4: ASSINATURAS                                   ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.gestao_assinaturas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.gestao_clientes_as(id) ON DELETE CASCADE,
    plan_id TEXT REFERENCES public.gestao_planos(id),
    status TEXT DEFAULT 'active',
    expiry_date TIMESTAMPTZ NOT NULL
);

ALTER TABLE IF EXISTS public.gestao_assinaturas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura pública assinaturas" ON public.gestao_assinaturas;
DROP POLICY IF EXISTS "Admin controla assinaturas" ON public.gestao_assinaturas;
CREATE POLICY "Leitura pública assinaturas" ON public.gestao_assinaturas FOR SELECT USING (true);
CREATE POLICY "Admin controla assinaturas" ON public.gestao_assinaturas FOR ALL USING (true);


-- ╔══════════════════════════════════════════════════════════╗
-- ║  PARTE 5: HISTÓRICO DE PAGAMENTOS (Relatórios)          ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.gestao_pagamentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.gestao_clientes_as(id) ON DELETE SET NULL,
    client_name TEXT,
    amount DECIMAL(10,2) NOT NULL,
    method TEXT, -- 'pix', 'card', etc.
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE IF EXISTS public.gestao_pagamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin vê pagamentos" ON public.gestao_pagamentos;
CREATE POLICY "Admin vê pagamentos" ON public.gestao_pagamentos FOR ALL USING (true);


-- ╔══════════════════════════════════════════════════════════╗
-- ║  PARTE 5: CONFIGURAÇÕES (PIX / PAGAMENTOS)              ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.gestao_config (
    id TEXT PRIMARY KEY,
    pix_key TEXT,
    card_link TEXT
);

ALTER TABLE IF EXISTS public.gestao_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Público vê configurações" ON public.gestao_config;
CREATE POLICY "Público vê configurações" ON public.gestao_config FOR SELECT USING (true);
CREATE POLICY "Admin edita config" ON public.gestao_config FOR ALL USING (true);

INSERT INTO public.gestao_config (id, pix_key) VALUES ('main', '51997222728') 
ON CONFLICT (id) DO NOTHING;


-- ╔══════════════════════════════════════════════════════════╗
-- ║  PARTE 6: CONFIGS DO APP (key-value)                    ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.configs (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Configs públicas" ON public.configs;
CREATE POLICY "Configs públicas" ON public.configs FOR ALL USING (true);


-- ╔══════════════════════════════════════════════════════════╗
-- ║  VERIFICAÇÃO FINAL                                      ║
-- ╚══════════════════════════════════════════════════════════╝

SELECT tablename, rowsecurity AS rls_ativo
FROM pg_catalog.pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Resultado esperado:
-- budget_items          → App Orçamentos
-- budgets               → App Orçamentos
-- clientes_os           → App Orçamentos ✅
-- configs               → App Orçamentos (config JSON)
-- gestao_assinaturas    → Painel Admin ✅
-- gestao_clientes_as    → Painel Admin ✅
-- gestao_config         → Painel Admin (PIX/Pagamento) ✅
-- gestao_planos         → Painel Admin ✅
-- materials             → App Orçamentos
-- packages              → App Orçamentos
-- service_orders        → App Orçamentos
-- services              → App Orçamentos
