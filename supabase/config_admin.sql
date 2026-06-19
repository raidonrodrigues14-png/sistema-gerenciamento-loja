-- Tabela de configuração administrativa da loja. Por enquanto guarda só o
-- PIN do dono, usado para proteger ações sensíveis e irreversíveis (como
-- zerar dados do sistema) — assim só quem sabe o PIN consegue fazer isso,
-- mesmo que outra pessoa esteja logada no sistema. Seguro rodar de novo.

CREATE TABLE IF NOT EXISTS config_admin (
  id       int PRIMARY KEY DEFAULT 1,
  pin_hash text,
  CONSTRAINT config_admin_unica CHECK (id = 1)
);
INSERT INTO config_admin (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE config_admin ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acesso total autenticado" ON config_admin;
CREATE POLICY "acesso total autenticado" ON config_admin
  FOR ALL USING (auth.role() = 'authenticated');
