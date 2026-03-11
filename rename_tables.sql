-- RENOMEAR TABELA DE CLIENTES PARA EVITAR CONFLITO
ALTER TABLE IF EXISTS public.gestao_clientes RENAME TO gestao_clientes_assinantes;

-- ATUALIZAR REFERÊNCIA NA TABELA DE ASSINATURAS (CASCADE)
-- PostgreSQL renomeia as FKs automaticamente, mas vamos garantir o RLS.

ALTER TABLE public.gestao_clientes_assinantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública para login" ON public.gestao_clientes_assinantes;
DROP POLICY IF EXISTS "Admin pode tudo" ON public.gestao_clientes_assinantes;

CREATE POLICY "Leitura pública para login" ON public.gestao_clientes_assinantes FOR SELECT USING (true);
CREATE POLICY "Admin pode tudo" ON public.gestao_clientes_assinantes FOR ALL USING (true);

-- Script de diagnóstico para confirmar
SELECT 'Tabelas atuais:' as info;
SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename LIKE 'gestao_%';
