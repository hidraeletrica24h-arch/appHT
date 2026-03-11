-- ============================================================
-- SCRIPT DEFINITIVO: SEPARAÇÃO CLARA DE TABELAS
-- Versão 2.0 - Execute no SQL Editor do Supabase
-- ============================================================

-- ╔══════════════════════════════════════════════════════════╗
-- ║  PARTE 1: TABELAS DO PAINEL ADMIN (Assinantes/Gestão)   ║
-- ╚══════════════════════════════════════════════════════════╝

-- Renomeia a tabela de clientes da gestão para o nome curto e claro
ALTER TABLE IF EXISTS public.gestao_clientes RENAME TO gestao_clientes_as;
ALTER TABLE IF EXISTS public.gestao_clientes_assinantes RENAME TO gestao_clientes_as;

-- Garante que as políticas de RLS estão corretas para o novo nome
ALTER TABLE IF EXISTS public.gestao_clientes_as ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública para login" ON public.gestao_clientes_as;
DROP POLICY IF EXISTS "Admin pode tudo" ON public.gestao_clientes_as;

CREATE POLICY "Leitura pública para login" ON public.gestao_clientes_as FOR SELECT USING (true);
CREATE POLICY "Admin controla tudo" ON public.gestao_clientes_as FOR ALL USING (true);

-- ╔══════════════════════════════════════════════════════════╗
-- ║  PARTE 2: TABELAS DO APP DE ORÇAMENTOS (Clientes/OS)    ║
-- ╚══════════════════════════════════════════════════════════╝

-- Renomeia a tabela de clientes do app de orçamento
ALTER TABLE IF EXISTS public.clients RENAME TO clientes_os;

-- Garante RLS para clientes_os
ALTER TABLE IF EXISTS public.clientes_os ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access" ON public.clientes_os;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.clientes_os;
DROP POLICY IF EXISTS "Enable all for service role" ON public.clientes_os;

CREATE POLICY "Acesso total clientes OS" ON public.clientes_os FOR ALL USING (true);

-- ╔══════════════════════════════════════════════════════════╗
-- ║  VERIFICAÇÃO FINAL                                       ║
-- ╚══════════════════════════════════════════════════════════╝

SELECT tablename, rowsecurity 
FROM pg_catalog.pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Resultado esperado:
-- clientes_os         → App de Orçamentos
-- gestao_assinaturas  → Assinaturas dos clientes DO PAINEL
-- gestao_clientes_as  → Assinantes do Painel Admin
-- gestao_config       → Configurações (PIX, etc.)
-- gestao_planos       → Planos (Pro, Premium)
-- budgets, etc.       → App de Orçamentos
