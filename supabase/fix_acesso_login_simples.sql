-- Correção: o login do sistema deixou de usar o Supabase Auth (agora é
-- login/senha simples guardado no navegador — ver src/app/login/page.jsx).
-- Várias tabelas criadas antes dessa troca tinham uma regra de segurança
-- (RLS) que só liberava acesso para quem estivesse autenticado pelo Supabase
-- Auth ("auth.role() = 'authenticated'"). Como isso nunca mais vai acontecer,
-- essas tabelas ficaram bloqueadas pra leitura/gravação pelo app.
--
-- Esse arquivo troca a regra pra liberar o acesso (igual já é feito nas
-- tabelas principais como produtos e notas, que nunca tiveram RLS) — o
-- controle de quem entra no sistema passa a ser só a tela de login e os
-- PINs (config_admin / config_pix_venda), não mais o banco.
--
-- Seguro rodar de novo quantas vezes precisar.

DROP POLICY IF EXISTS "acesso total autenticado" ON config_admin;
CREATE POLICY "acesso liberado" ON config_admin FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "acesso total autenticado" ON config_pix_venda;
CREATE POLICY "acesso liberado" ON config_pix_venda FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "acesso total autenticado" ON pagamentos_pix;
CREATE POLICY "acesso liberado" ON pagamentos_pix FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "acesso total autenticado" ON licenca_config;
CREATE POLICY "acesso liberado" ON licenca_config FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "acesso total autenticado" ON pagamentos_licenca;
CREATE POLICY "acesso liberado" ON pagamentos_licenca FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "acesso total autenticado" ON pagamentos_parcela;
CREATE POLICY "acesso liberado" ON pagamentos_parcela FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_malinhas" ON malinhas;
CREATE POLICY "acesso liberado" ON malinhas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_malinha_itens" ON malinha_itens;
CREATE POLICY "acesso liberado" ON malinha_itens FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_parcelas" ON parcelas;
CREATE POLICY "acesso liberado" ON parcelas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_lancamentos" ON lancamentos;
CREATE POLICY "acesso liberado" ON lancamentos FOR ALL USING (true) WITH CHECK (true);
