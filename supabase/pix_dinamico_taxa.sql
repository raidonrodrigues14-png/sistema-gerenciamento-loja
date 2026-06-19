-- Adiciona a taxa do Pix dinâmico (QR automático via AbacatePay) na
-- configuração da loja (tela Nova Venda > Configurar chave Pix).
-- Esse valor é somado ao total da venda só quando o QR dinâmico é usado,
-- pra cobrir a taxa que a AbacatePay cobra por Pix. Roda independente de já
-- ter executado os outros arquivos de supabase/ antes — é seguro rodar de novo.

CREATE TABLE IF NOT EXISTS config_pix_venda (
  id          int PRIMARY KEY DEFAULT 1,
  chave_pix   text DEFAULT '',
  tipo_chave  text DEFAULT 'aleatoria',
  nome_loja   text DEFAULT 'Elta Variedades',
  cidade_loja text DEFAULT 'Fortaleza',
  CONSTRAINT config_pix_venda_unica CHECK (id = 1)
);
INSERT INTO config_pix_venda (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE config_pix_venda ADD COLUMN IF NOT EXISTS pin_hash text;
ALTER TABLE config_pix_venda ADD COLUMN IF NOT EXISTS taxa_pix_dinamico numeric(10,2) NOT NULL DEFAULT 0.90;

ALTER TABLE config_pix_venda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acesso total autenticado" ON config_pix_venda;
CREATE POLICY "acesso total autenticado" ON config_pix_venda
  FOR ALL USING (auth.role() = 'authenticated');
